package com.talentiq.repository.chat;

import com.talentiq.model.GroupChatInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface GroupChatInvitationRepository extends JpaRepository<GroupChatInvitation, Long> {

    @Query("SELECT i FROM GroupChatInvitation i " +
            "JOIN FETCH i.group g " +
            "JOIN FETCH i.createdByUser u " +
            "WHERE i.inviteToken = :token AND i.active = true AND i.expiresAt > :now")
    Optional<GroupChatInvitation> findValidByToken(@Param("token") String token, @Param("now") Instant now);

    Optional<GroupChatInvitation> findByInviteToken(String inviteToken);

    List<GroupChatInvitation> findByGroupIdAndActiveTrue(Long groupId);
}
