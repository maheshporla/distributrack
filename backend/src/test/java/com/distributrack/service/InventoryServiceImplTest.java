package com.distributrack.service;

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
import com.distributrack.service.impl.InventoryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InventoryServiceImplTest {

    private final InventoryRepository inventoryRepository = mock(InventoryRepository.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final StockMovementRepository stockMovementRepository = mock(StockMovementRepository.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final AuditService auditService = mock(AuditService.class);

    private final InventoryServiceImpl inventoryService = new InventoryServiceImpl(
            inventoryRepository,
            productRepository,
            stockMovementRepository,
            currentUserService,
            auditService
    );

    private Product product;
    private Inventory inventory;

    @BeforeEach
    void setUp() {
        product = Product.builder()
                .id(1L)
                .productName("Rice 5kg")
                .sku("RICE-5KG")
                .price(BigDecimal.valueOf(500))
                .build();

        inventory = Inventory.builder()
                .id(7L)
                .product(product)
                .quantity(20)
                .minimumStock(5)
                .maximumStock(100)
                .warehouseLocation("Main Warehouse")
                .active(true)
                .build();

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(inventoryRepository.findById(7L)).thenReturn(Optional.of(inventory));
        when(inventoryRepository.save(any(Inventory.class))).thenAnswer(inv -> inv.getArgument(0));
        when(stockMovementRepository.save(any(StockMovement.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void createInventoryRecordsInitialMovement() {

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(inventoryRepository.existsByProduct(product)).thenReturn(false);

        InventoryRequest request = InventoryRequest.builder()
                .productId(1L)
                .quantity(50)
                .minimumStock(5)
                .maximumStock(200)
                .warehouseLocation("Main Warehouse")
                .active(true)
                .build();

        InventoryResponse response = inventoryService.createInventory(request);

        assertEquals(50, response.getQuantity());
        verify(stockMovementRepository).save(argThat(m ->
                m.getType() == StockMovementType.IN
                        && m.getQuantityChange() == 50
                        && m.getBalanceAfter() == 50));
    }

    @Test
    void adjustStockInRecordsPositiveMovement() {

        StockAdjustRequest request = StockAdjustRequest.builder()
                .quantity(10)
                .type(StockMovementType.IN)
                .note("Restock from supplier")
                .build();

        StockMovementResponse movement = inventoryService.adjustStock(7L, request);

        assertEquals(30, movement.getBalanceAfter());
        assertEquals(10, movement.getQuantityChange());
        assertEquals(StockMovementType.IN, movement.getType());
        assertEquals(30, inventory.getQuantity());
    }

    @Test
    void adjustStockOutRejectsNegativeBalance() {

        StockAdjustRequest request = StockAdjustRequest.builder()
                .quantity(25) // more than the 20 in stock
                .type(StockMovementType.OUT)
                .build();

        assertThrows(IllegalArgumentException.class,
                () -> inventoryService.adjustStock(7L, request));

        // Balance untouched.
        assertEquals(20, inventory.getQuantity());
        verify(stockMovementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    void adjustStockOutRecordsNegativeChange() {

        StockAdjustRequest request = StockAdjustRequest.builder()
                .quantity(5)
                .type(StockMovementType.OUT)
                .note("Dispatch to shop")
                .build();

        StockMovementResponse movement = inventoryService.adjustStock(7L, request);

        assertEquals(-5, movement.getQuantityChange());
        assertEquals(15, movement.getBalanceAfter());
        assertEquals(15, inventory.getQuantity());
    }

    @Test
    void adjustStockAbsoluteSetsBalance() {

        StockAdjustRequest request = StockAdjustRequest.builder()
                .quantity(60)
                .type(StockMovementType.ADJUSTMENT)
                .note("Stock count correction")
                .build();

        StockMovementResponse movement = inventoryService.adjustStock(7L, request);

        assertEquals(40, movement.getQuantityChange());
        assertEquals(60, movement.getBalanceAfter());
    }

    @Test
    void updateInventoryRecordsAdjustmentForQuantityChange() {

        InventoryRequest request = InventoryRequest.builder()
                .productId(1L)
                .quantity(35) // changed from 20
                .minimumStock(5)
                .maximumStock(100)
                .warehouseLocation("Main Warehouse")
                .active(true)
                .build();

        inventoryService.updateInventory(7L, request);

        verify(stockMovementRepository).save(argThat(m ->
                m.getType() == StockMovementType.ADJUSTMENT
                        && m.getQuantityChange() == 15
                        && m.getBalanceAfter() == 35));
    }

    @Test
    void movementsAreReturnedNewestFirst() {

        when(stockMovementRepository.findByInventoryOrderByCreatedAtDesc(inventory))
                .thenReturn(List.of(
                        StockMovement.builder()
                                .id(2L)
                                .inventory(inventory)
                                .product(product)
                                .type(StockMovementType.OUT)
                                .quantityChange(-3)
                                .balanceAfter(17)
                                .build(),
                        StockMovement.builder()
                                .id(1L)
                                .inventory(inventory)
                                .product(product)
                                .type(StockMovementType.IN)
                                .quantityChange(20)
                                .balanceAfter(20)
                                .build()
                ));

        List<StockMovementResponse> movements = inventoryService.getStockMovements(7L);

        assertEquals(2, movements.size());
        assertEquals(2L, movements.get(0).getId());
        assertEquals(-3, movements.get(0).getQuantityChange());
    }
}
