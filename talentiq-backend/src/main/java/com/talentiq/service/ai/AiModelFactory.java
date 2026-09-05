package com.talentiq.service.ai;

import com.talentiq.config.AppProperties;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.model.ollama.OllamaChatModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiModelFactory {

    private final AppProperties appProperties;

    private final Map<String, ChatLanguageModel> modelCache = new ConcurrentHashMap<>();

    /**
     * Get or create a ChatLanguageModel instance with caching.
     */
    public ChatLanguageModel getModel(String preferredModel, Double temperature) {
        String provider = appProperties.getAi().getProvider();
        if (provider == null || provider.isBlank()) {
            provider = "openai";
        }

        double temp = (temperature != null && temperature >= 0.0 && temperature <= 2.0) ? temperature : 0.7;
        String cacheKey = provider.toLowerCase() + ":" + (preferredModel != null ? preferredModel : "default") + ":" + temp;

        return modelCache.computeIfAbsent(cacheKey, key -> buildModel(preferredModel, temp));
    }

    private ChatLanguageModel buildModel(String modelName, double temperature) {
        String provider = appProperties.getAi().getProvider();
        if (provider == null) provider = "openai";

        try {
            switch (provider.toLowerCase()) {
                case "gemini": {
                    String geminiKey = appProperties.getAi().getGemini().getApiKey();
                    if (geminiKey != null && !geminiKey.isBlank() && !geminiKey.equalsIgnoreCase("test-key")) {
                        String m = (modelName != null && !modelName.isBlank()) ? modelName : appProperties.getAi().getGemini().getModel();
                        log.info("Instantiating GoogleAiGeminiChatModel with model: {}", m);
                        return GoogleAiGeminiChatModel.builder()
                                .apiKey(geminiKey)
                                .modelName(m)
                                .temperature(temperature)
                                .build();
                    }
                    break;
                }
                case "ollama": {
                    String baseUrl = appProperties.getAi().getOllama().getBaseUrl();
                    String m = (modelName != null && !modelName.isBlank()) ? modelName : appProperties.getAi().getOllama().getModel();
                    log.info("Instantiating OllamaChatModel at {} with model: {}", baseUrl, m);
                    return OllamaChatModel.builder()
                            .baseUrl(baseUrl)
                            .modelName(m)
                            .temperature(temperature)
                            .timeout(Duration.ofSeconds(30))
                            .build();
                }
                case "openai":
                default: {
                    String openAiKey = appProperties.getAi().getOpenai().getApiKey();
                    if (openAiKey != null && !openAiKey.isBlank() && !openAiKey.equalsIgnoreCase("test-key")) {
                        String m = (modelName != null && !modelName.isBlank()) ? modelName : appProperties.getAi().getOpenai().getModel();
                        log.info("Instantiating OpenAiChatModel with model: {}", m);
                        return OpenAiChatModel.builder()
                                .apiKey(openAiKey)
                                .modelName(m)
                                .temperature(temperature)
                                .timeout(Duration.ofSeconds(30))
                                .maxRetries(1)
                                .build();
                    }
                    break;
                }
            }
        } catch (Exception e) {
            log.error("Failed to initialize ChatLanguageModel: {}", e.getMessage());
        }

        log.info("No active AI provider key found. System will use deterministic offline fallback responses.");
        return null;
    }

    public boolean isLiveModelConfigured() {
        String provider = appProperties.getAi().getProvider();
        if ("gemini".equalsIgnoreCase(provider)) {
            String key = appProperties.getAi().getGemini().getApiKey();
            return key != null && !key.isBlank() && !"test-key".equalsIgnoreCase(key);
        } else if ("ollama".equalsIgnoreCase(provider)) {
            return true;
        } else {
            String key = appProperties.getAi().getOpenai().getApiKey();
            return key != null && !key.isBlank() && !"test-key".equalsIgnoreCase(key);
        }
    }
}
