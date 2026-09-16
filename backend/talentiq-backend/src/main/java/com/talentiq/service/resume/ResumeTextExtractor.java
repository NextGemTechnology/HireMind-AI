package com.talentiq.service.resume;

import com.talentiq.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

@Component
@Slf4j
public class ResumeTextExtractor {

    /**
     * Extract raw text from a document using Apache Tika AutoDetectParser.
     * Handles PDF, DOCX, and other text-based files.
     *
     * @param fileBytes document content bytes
     * @return raw extracted text
     */
    public String extractText(byte[] fileBytes) {
        try (InputStream stream = new ByteArrayInputStream(fileBytes)) {
            BodyContentHandler handler = new BodyContentHandler(-1); // -1 disables write limit
            Metadata metadata = new Metadata();
            AutoDetectParser parser = new AutoDetectParser();

            parser.parse(stream, handler, metadata);
            return handler.toString().trim();
        } catch (Exception e) {
            log.error("Failed to parse document text: {}", e.getMessage());
            throw new BusinessException("PARSER_ERROR", "Failed to extract text from document content: " + e.getMessage());
        }
    }
}
