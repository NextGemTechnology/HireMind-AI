package com.talentiq.repository.chat;

import com.talentiq.model.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {

    @Query("SELECT g FROM ChatGroup g " +
            "JOIN ChatGroupMember m ON m.group.id = g.id " +
            "WHERE m.user.id = :userId AND g.active = true " +
            "ORDER BY g.updatedAt DESC")
    List<ChatGroup> findGroupsByUserId(@Param("userId") Long userId);

    List<ChatGroup> findByCompanyIdAndActiveTrue(Long companyId);
}
