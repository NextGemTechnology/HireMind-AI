package com.talentiq.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.util.List;

/**
 * Paginated API response wrapper.
 * Carries the data list alongside Spring Data pagination metadata.
 *
 * @param <T> element type
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PagedResponse<T> {

    private boolean success;
    private String message;
    private List<T> data;
    private PageMeta page;
    private Instant timestamp;

    private PagedResponse(boolean success, String message, List<T> data, PageMeta page) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.page = page;
        this.timestamp = Instant.now();
    }

    public static <T> PagedResponse<T> of(Page<T> page) {
        return new PagedResponse<>(
                true,
                "Success",
                page.getContent(),
                PageMeta.of(page)
        );
    }

    public static <T> PagedResponse<T> of(String message, Page<T> page) {
        return new PagedResponse<>(
                true,
                message,
                page.getContent(),
                PageMeta.of(page)
        );
    }

    /**
     * Pagination metadata embedded in each paged response.
     */
    @Getter
    public static class PageMeta {
        private final int currentPage;
        private final int pageSize;
        private final long totalElements;
        private final int totalPages;
        private final boolean first;
        private final boolean last;

        private PageMeta(int currentPage, int pageSize, long totalElements, int totalPages,
                         boolean first, boolean last) {
            this.currentPage = currentPage;
            this.pageSize = pageSize;
            this.totalElements = totalElements;
            this.totalPages = totalPages;
            this.first = first;
            this.last = last;
        }

        public static PageMeta of(Page<?> page) {
            return new PageMeta(
                    page.getNumber(),
                    page.getSize(),
                    page.getTotalElements(),
                    page.getTotalPages(),
                    page.isFirst(),
                    page.isLast()
            );
        }
    }
}
