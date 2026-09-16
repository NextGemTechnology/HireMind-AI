package com.talentiq.repository.chat;

import com.talentiq.model.ChatGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatGroupMemberRepository extends JpaRepository<ChatGroupMember, Long> {

    @Query("SELECT m FROM ChatGroupMember m " +
            "JOIN FETCH m.user u " +
            "WHERE m.group.id = :groupId")
    List<ChatGroupMember> findByGroupId(@Param("groupId") Long groupId);

    Optional<ChatGroupMember> findByGroupIdAndUserId(Long groupId, Long userId);

    boolean existsByGroupIdAndUserId(Long groupId, Long userId);

    void deleteByGroupIdAndUserId(Long groupId, Long userId);
}
