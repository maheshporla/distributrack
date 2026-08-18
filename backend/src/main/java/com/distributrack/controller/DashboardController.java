package com.distributrack.controller;

import com.distributrack.dto.response.DashboardResponse;
import com.distributrack.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    // Dashboard Summary
    @GetMapping("/summary")
    public DashboardResponse getDashboardSummary() {

        return dashboardService.getDashboardSummary();
    }
}