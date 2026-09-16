package com.talentiq.infrastructure.storage;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * Store a file under the specified sub-directory.
     *
     * @param file     the multipart file to store
     * @param subDir   sub-folder inside the base storage path (e.g., resumes, avatars, logos)
     * @param userId   owner's user ID
     * @return storage details containing the relative path/URI
     */
    String storeFile(MultipartFile file, String subDir, Long userId);

    /**
     * Retrieve the file contents as byte array.
     *
     * @param fileUrl relative path or URL of the file
     * @return file content bytes
     */
    byte[] retrieveFile(String fileUrl);

    /**
     * Delete the file from storage.
     *
     * @param fileUrl relative path or URL of the file
     */
    void deleteFile(String fileUrl);
}
