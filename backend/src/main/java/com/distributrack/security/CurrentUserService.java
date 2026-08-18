package com.distributrack.security;

import com.distributrack.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Reusable way to obtain the currently authenticated {@link User}.
 *
 * The JWT filter authenticates with the {@link User} entity as the
 * principal, so the role / id / email on that object are the only values
 * that should ever be trusted for "who is acting". Endpoints and services
 * must NOT trust userId / shopkeeperId / deliveryBoyId taken from request
 * bodies or URL parameters when the operation belongs to the caller.
 */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    /**
     * @return the authenticated {@link User}, or throws when there is no
     *         valid authentication context (defense in depth — secured
     *         endpoints should never reach this branch).
     */
    public User getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null ||
                !(authentication.getPrincipal() instanceof User user)) {

            throw new IllegalStateException(
                    "No authenticated user in the security context"
            );
        }

        return user;
    }
}
