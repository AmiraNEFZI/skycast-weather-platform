package tn.esprit.airqualityuvservice.client;

import org.junit.jupiter.api.Test;
import tn.esprit.airqualityuvservice.client.dto.OpenMeteoResponse;

import static org.junit.jupiter.api.Assertions.assertNotNull;

class OpenMeteoClientTest {

    @Test
    void testGetCurrentAirQuality() {

        OpenMeteoClient client = new OpenMeteoClient(
                "https://air-quality-api.open-meteo.com/v1/air-quality"
        );

        OpenMeteoResponse response =
                client.getCurrentAirQuality(36.8065, 10.1815);

        assertNotNull(response);
        assertNotNull(response.getCurrent());

        System.out.println(response.getCurrent());
    }
}