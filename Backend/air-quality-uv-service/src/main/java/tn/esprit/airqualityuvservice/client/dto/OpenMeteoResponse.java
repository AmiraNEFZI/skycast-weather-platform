package tn.esprit.airqualityuvservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OpenMeteoResponse {

    private Current current;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Current {

        private String time;

        @JsonProperty("us_aqi")
        private Integer usAqi;

        @JsonProperty("pm2_5")
        private Double pm25;

        private Double pm10;

        @JsonProperty("uv_index")
        private Double uvIndex;
    }
}