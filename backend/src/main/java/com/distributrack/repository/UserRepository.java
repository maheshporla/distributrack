package com.distributrack.repository;

import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    List<User> findByRole_Name(RoleName roleName);

    boolean existsByRole_Name(RoleName roleName);

}