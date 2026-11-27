package tn.esprit.airqualityuvservice.health;

import com.influxdb.client.InfluxDBClient;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

@Component
public class InfluxDBHealthIndicator implements HealthIndicator {

    private final InfluxDBClient client;

    public InfluxDBHealthIndicator(InfluxDBClient client) {
        this.client = client;
    }

    @Override
    public Health health() {
        try {
            if (client.ping()) {
                return Health.up().build();
            }
            return Health.down().build();
        } catch (Exception e) {
            return Health.down().build();
        }
    }
}