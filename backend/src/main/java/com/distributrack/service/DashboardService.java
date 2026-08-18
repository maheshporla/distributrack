package com.distributrack.service;

import com.distributrack.dto.response.DashboardResponse;

public interface DashboardService {

    /**
     * Returns dashboard summary statistics.
     */
    DashboardResponse getDashboardSummary();
}