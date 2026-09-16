package com.talentiq.infrastructure.storage;

import com.talentiq.common.exception.BadRequestException;
import com.talentiq.common.exception.BusinessException;
import com.talentiq.common.exception.ResourceNotFoundException;
import com.talentiq.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageServiceImpl implements FileStorageService {

    private final AppProperties appProperties;

    @Override
    public String storeFile(MultipartFile file, String subDir, Long userId) {
        if (file.isEmpty()) {
            throw new BadRequestException("Failed to store empty file");
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (originalFilename.contains("..")) {
            throw new BadRequestException("Cannot store file with relative path outside current directory " + originalFilename);
        }

        // Generate unique name: <userId>_<uuid>_<originalName>
        String extension = StringUtils.getFilenameExtension(originalFilename);
        String storedFilename = userId + "_" + UUID.randomUUID() + (extension != null ? "." + extension : "");

        try {
            Path baseLocation = Paths.get(appProperties.getStorage().getLocal().getBasePath()).toAbsolutePath().normalize();
            Path targetLocation = baseLocation.resolve(subDir).resolve(storedFilename).normalize();

            // Create target folders if they don't exist
            Files.createDirectories(targetLocation.getParent());

            // Copy file content
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Return relative file path (used as fileUrl)
            return subDir + "/" + storedFilename;
        } catch (IOException e) {
            log.error("Could not initialize storage or save file: {}", e.getMessage());
            throw new BusinessException("STORAGE_ERROR", "Failed to store file: " + originalFilename);
        }
    }

    @Override
    public byte[] retrieveFile(String fileUrl) {
        try {
            Path baseLocation = Paths.get(appProperties.getStorage().getLocal().getBasePath()).toAbsolutePath().normalize();
            Path filePath = baseLocation.resolve(fileUrl).normalize();

            if (!Files.exists(filePath)) {
                throw new ResourceNotFoundException("File", "url", fileUrl);
            }

            return Files.readAllBytes(filePath);
        } catch (IOException e) {
            log.error("Could not read file from storage: {}", e.getMessage());
            throw new BusinessException("READ_ERROR", "Failed to retrieve file contents");
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        try {
            Path baseLocation = Paths.get(appProperties.getStorage().getLocal().getBasePath()).toAbsolutePath().normalize();
            Path filePath = baseLocation.resolve(fileUrl).normalize();
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Failed to delete file at path {}: {}", fileUrl, e.getMessage());
        }
    }
}
