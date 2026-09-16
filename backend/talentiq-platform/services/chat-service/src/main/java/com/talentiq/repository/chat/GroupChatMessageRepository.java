package com.talentiq.repository.chat;

import com.talentiq.model.GroupChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GroupChatMessageRepository extends JpaRepository<GroupChatMessage, Long> {

    @Query("SELECT m FROM GroupChatMessage m " +
            "WHERE m.group.id = :groupId " +
            "ORDER BY m.sentAt ASC")
    List<GroupChatMessage> findByGroupIdOrderBySentAtAsc(@Param("groupId") Long groupId);

    @Query("SELECT m FROM GroupChatMessage m " +
            "WHERE m.group.id = :groupId " +
            "ORDER BY m.sentAt DESC")
    Page<GroupChatMessage> findPagedByGroupId(@Param("groupId") Long groupId, Pageable pageable);
}
