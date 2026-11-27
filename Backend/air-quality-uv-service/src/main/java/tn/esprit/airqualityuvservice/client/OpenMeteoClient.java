package tn.esprit.airqualityuvservice.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import tn.esprit.airqualityuvservice.client.dto.OpenMeteoResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Component
public class OpenMeteoClient {

    private final RestClient restClient;

    public OpenMeteoClient(
            @Value("${openmeteo.url}") String url) {

        SimpleClientHttpRequestFactory factory =
                new SimpleClientHttpRequestFactory();

        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);

        this.restClient = RestClient.builder()
                .baseUrl(url)
                .requestFactory(factory)
                .build();
    }

    public OpenMeteoResponse getCurrentAirQuality(
            double latitude, double longitude) {

        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .queryParam("latitude", latitude)
                        .queryParam("longitude", longitude)
                        .queryParam("current",
                                "us_aqi,pm2_5,pm10,uv_index")
                        .queryParam("timezone", "GMT")
                        .build())
                .retrieve()
                .body(OpenMeteoResponse.class);
    }
}