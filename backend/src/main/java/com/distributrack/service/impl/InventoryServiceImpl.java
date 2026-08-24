package com.distributrack.service.impl;

import com.distributrack.dto.request.InventoryRequest;
import com.distributrack.dto.request.StockAdjustRequest;
import com.distributrack.dto.response.InventoryResponse;
import com.distributrack.dto.response.StockMovementResponse;
import com.distributrack.entity.Inventory;
import com.distributrack.entity.Product;
import com.distributrack.entity.StockMovement;
import com.distributrack.enums.StockMovementType;
import com.distributrack.repository.InventoryRepository;
import com.distributrack.repository.ProductRepository;
import com.distributrack.repository.StockMovementRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import com.distributrack.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Inventory with a real stock-movement model:
 *
 *  - the balance can never go below zero (validated before every write)
 *  - every change (IN / OUT / ADJUSTMENT) is recorded to
 *    {@code stock_movements} in the SAME transaction as the balance
 *    update, so history and balance can never diverge
 *  - minimum stock drives the low-stock alerts (scheduled scan)
 */
@Service
@RequiredArgsConstructor
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository stockMovementRepository;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    @Override
    public InventoryResponse createInventory(InventoryRequest request) {

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (inventoryRepository.existsByProduct(product)) {
            throw new RuntimeException("Inventory already exists for this product");
        }

        if (request.getQuantity() < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative");
        }

        Inventory inventory = Inventory.builder()
                .product(product)
                .quantity(request.getQuantity())
                .minimumStock(request.getMinimumStock())
                .maximumStock(request.getMaximumStock())
                .warehouseLocation(request.getWarehouseLocation())
                .active(request.getActive())
                .build();

        inventory = inventoryRepository.save(inventory);

        recordMovement(inventory, StockMovementType.IN, request.getQuantity(),
                "Initial stock");

        auditService.log("INVENTORY_CREATE", "Inventory", inventory.getId(),
                "Inventory created for " + product.getProductName()
                        + " with " + request.getQuantity() + " units at "
                        + request.getWarehouseLocation());

        return mapToResponse(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryResponse> getAllInventory() {

        return inventoryRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryResponse getInventoryById(Long id) {

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));

        return mapToResponse(inventory);
    }

    @Override
    public InventoryResponse updateInventory(Long id,
                                             InventoryRequest request) {

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));

        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (request.getQuantity() < 0) {
            throw new IllegalArgumentException("Quantity cannot be negative");
        }

        int previousQuantity = inventory.getQuantity();

        inventory.setProduct(product);
        inventory.setQuantity(request.getQuantity());
        inventory.setMinimumStock(request.getMinimumStock());
        inventory.setMaximumStock(request.getMaximumStock());
        inventory.setWarehouseLocation(request.getWarehouseLocation());
        inventory.setActive(request.getActive());

        inventory = inventoryRepository.save(inventory);

        // Every balance change is part of the movement history.
        int delta = request.getQuantity() - previousQuantity;
        if (delta != 0) {
            recordMovement(inventory, StockMovementType.ADJUSTMENT, delta,
                    "Inventory updated (was " + previousQuantity + ")");
        }

        auditService.log("INVENTORY_UPDATE", "Inventory", inventory.getId(),
                "Inventory updated: " + previousQuantity + " -> " + request.getQuantity()
                        + " units for " + product.getProductName());

        return mapToResponse(inventory);
    }

    @Override
    public void deleteInventory(Long id) {

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));

        inventoryRepository.delete(inventory);

        auditService.log("INVENTORY_DELETE", "Inventory", id,
                "Inventory deleted for " + inventory.getProduct().getProductName());
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryResponse getInventoryByProduct(Long productId) {

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        Inventory inventory = inventoryRepository.findByProduct(product)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));

        return mapToResponse(inventory);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryResponse> getLowStockProducts() {

        return inventoryRepository.findAll()
                .stream()
                .filter(inventory ->
                        inventory.getQuantity() < inventory.getMinimumStock())
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryResponse> getInventoryByWarehouse(String warehouseLocation) {

        return inventoryRepository
                .findByWarehouseLocationIgnoreCase(warehouseLocation)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public StockMovementResponse adjustStock(Long id, StockAdjustRequest request) {

        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));

        int change;
        int newBalance;

        switch (request.getType()) {
            case IN -> {
                change = request.getQuantity();
                newBalance = inventory.getQuantity() + change;
            }
            case OUT -> {
                change = -request.getQuantity();
                newBalance = inventory.getQuantity() - request.getQuantity();
            }
            case ADJUSTMENT -> {
                newBalance = request.getQuantity();
                change = newBalance - inventory.getQuantity();
            }
            default -> throw new IllegalArgumentException("Unsupported movement type: " + request.getType());
        }

        // Negative stock is never allowed.
        if (newBalance < 0) {
            throw new IllegalArgumentException(
                    "Stock cannot go below zero (current balance: "
                            + inventory.getQuantity() + ", requested change: " + change + ")"
            );
        }

        inventory.setQuantity(newBalance);
        inventory = inventoryRepository.save(inventory);

        StockMovement movement = recordMovement(inventory, request.getType(),
                change, request.getNote() != null ? request.getNote() : "");

        auditService.log("INVENTORY_ADJUST", "Inventory", inventory.getId(),
                request.getType() + " of " + Math.abs(change) + " units (balance now "
                        + newBalance + ") for " + inventory.getProduct().getProductName());

        return mapToResponse(movement);
    }

    @Override
    @Transactional(readOnly = true)
    public List<StockMovementResponse> getStockMovements(Long inventoryId) {

        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));

        return stockMovementRepository.findByInventoryOrderByCreatedAtDesc(inventory)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private StockMovement recordMovement(Inventory inventory, StockMovementType type,
                                         int quantityChange, String note) {

        Long actorId = null;
        try {
            actorId = currentUserService.getCurrentUser().getId();
        } catch (Exception ignored) {
            // No authenticated actor (e.g. scheduled/system flow) — keep null.
        }

        StockMovement movement = StockMovement.builder()
                .inventory(inventory)
                .product(inventory.getProduct())
                .warehouseLocation(inventory.getWarehouseLocation())
                .type(type)
                .quantityChange(quantityChange)
                .balanceAfter(inventory.getQuantity())
                .note(note)
                .createdBy(actorId)
                .build();

        return stockMovementRepository.save(movement);
    }

    private InventoryResponse mapToResponse(Inventory inventory) {

        return InventoryResponse.builder()
                .id(inventory.getId())
                .productId(inventory.getProduct().getId())
                .productName(inventory.getProduct().getProductName())
                .quantity(inventory.getQuantity())
                .minimumStock(inventory.getMinimumStock())
                .maximumStock(inventory.getMaximumStock())
                .warehouseLocation(inventory.getWarehouseLocation())
                .active(inventory.getActive())
                .createdAt(inventory.getCreatedAt())
                .updatedAt(inventory.getUpdatedAt())
                .build();
    }

    private StockMovementResponse mapToResponse(StockMovement movement) {

        return StockMovementResponse.builder()
                .id(movement.getId())
                .inventoryId(movement.getInventory().getId())
                .productId(movement.getProduct().getId())
                .productName(movement.getProduct().getProductName())
                .warehouseLocation(movement.getWarehouseLocation())
                .type(movement.getType())
                .quantityChange(movement.getQuantityChange())
                .balanceAfter(movement.getBalanceAfter())
                .note(movement.getNote())
                .createdBy(movement.getCreatedBy())
                .orderId(movement.getOrder() != null ? movement.getOrder().getId() : null)
                .createdAt(movement.getCreatedAt())
                .build();
    }
}
