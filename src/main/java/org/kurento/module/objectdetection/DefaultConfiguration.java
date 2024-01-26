package org.kurento.module.objectdetection;

import org.kurento.client.KurentoClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

import jakarta.annotation.PostConstruct;

@Configuration
public class DefaultConfiguration {
    private final Logger log = LoggerFactory.getLogger(DefaultConfiguration.class);

    /** Kurento Media Server ip and entrypoint, e.g., http://0.0.0.0:8888/kurento */
    @Value("${kms.url}")
    public String KMS_URL;

    /** TURN server ip from AP (usually LAN IP), e.g., 0.0.0.0:3478?transport=udp */
    @Value("${turn1.internal.sever}")
    public String TURN1_INTERNAL_SERVER;

    /** TURN server ip from user (usually public IP), e.g., 111.111.111.111:3478?transport=udp */
    @Value("${turn1.server}")
    public String TURN1_SERVER;

    /** TURN server name */
    @Value("${turn1.name}")
    public String TURN1_NAME;

    /** TURN server ip from AP (usually LAN IP), e.g., 0.0.0.0:3478?transport=udp */
    @Value("${turn2.internal.sever}")
    public String TURN2_INTERNAL_SERVER;

    /** TURN server ip from user (usually public IP), e.g., 111.111.111.111:3478?transport=udp */
    @Value("${turn2.server}")
    public String TURN2_SERVER;

    /** TURN server name */
    @Value("${turn2.name}")
    public String TURN2_NAME;

    /** CoTURN static-auth-secret parameter, used for user authentication */
    @Value("${turn.static-auth-secret}")
    public String TURN_STATIC_AUTH_SECRET;

    /** default confidence for filtering output objects; should be 0.1~0.9 */
    @Value("${objdet.default.confidence}")
    public float OBJDET_DEFAULT_CONFIDENCE;

    /** default objects maximum output number; should be 1~100 */
    @Value("${objdet.default.boxlimit}")
    public int OBJDET_DEFAULT_BOXLIMIT;

    /** default value for drawing objects on the stream or not */
    @Value("${objdet.default.drawbox}")
    public boolean OBJDET_DEFAULT_DRAWBOX;

    /** default value for inference delay between frames; should be 100~2000 */
    @Value("${objdet.detectedbox.speed.millisec}")
    public int OBJDET_DETECTEDBOX_SPEED_MILLISEC;

    /** whether to combine similar objects between frames or not */
    @Value("${objdet.detectedbox.distinct}")
    public boolean OBJDET_DETECTEDBOX_DISTINCT;

    /**
     * threshold for combining similar objects; how close of two objects in ratio is treated as identical object; should be 0.001~0.9
     */
    @Value("${objdet.detectedbox.distinct.ratio}")
    public float OBJDET_DETECTEDBOX_DISTINCT_RATIO;

    @Bean
    public KurentoClient kurento() {
        return KurentoClient.create(KMS_URL);
    }

    @Bean
    public ServerEndpointExporter serverEndpointExporter() {
        ServerEndpointExporter exporter = new ServerEndpointExporter();
        exporter.setAnnotatedEndpointClasses(DefaultController.class);
        return exporter;
    }

    @PostConstruct
    private void check() throws IllegalArgumentException {
        log.info("check default parameters");
        if (KMS_URL.equals("")) {
            log.error("kms.url cannot be empty");
            throw new IllegalArgumentException("kms.url cannot be empty");
        }
        boolean turnEnable = true;
        if (TURN1_INTERNAL_SERVER.equals("") || TURN1_SERVER.equals("") || TURN1_NAME.equals("")) {
            log.warn("TURN server 1 disabled");
            turnEnable = false;
        }

        if (TURN2_INTERNAL_SERVER.equals("") || TURN2_SERVER.equals("") || TURN2_NAME.equals("")) {
            log.warn("TURN server 2 disabled");
        }

        if (turnEnable == true && TURN_STATIC_AUTH_SECRET.equals("")) {
            log.error("turn.static-auth-secret cannot be empty");
            throw new IllegalArgumentException("turn.static-auth-secret cannot be empty");
        }

        if (OBJDET_DEFAULT_CONFIDENCE <= 0 || OBJDET_DEFAULT_CONFIDENCE >= 1) {
            log.error("invalid objdet.default.confidence {}, should be 0.1~0.9", OBJDET_DEFAULT_CONFIDENCE);
            throw new IllegalArgumentException("invalid objdet.default.confidence, should be 0.1~0.9");
        }

        if (OBJDET_DEFAULT_BOXLIMIT <= 0 || OBJDET_DEFAULT_BOXLIMIT > 100) {
            log.error("invalid objdet.default.boxlimit {}, should be 1~100", OBJDET_DEFAULT_BOXLIMIT);
            throw new IllegalArgumentException("invalid objdet.default.boxlimit, should be 1~100");
        }

        if (OBJDET_DETECTEDBOX_SPEED_MILLISEC < 100 || OBJDET_DETECTEDBOX_SPEED_MILLISEC > 2000) {
            log.error("invalid objdet.detectedbox.speed.millisec {}, should be 100~2000",
                    OBJDET_DETECTEDBOX_SPEED_MILLISEC);
            throw new IllegalArgumentException("invalid objdet.detectedbox.speed.millisec, should be 100~2000");
        }

        if (OBJDET_DETECTEDBOX_DISTINCT_RATIO < 0.001 || OBJDET_DETECTEDBOX_DISTINCT_RATIO > 0.9) {
            log.error("invalid objdet.detectedbox.distinct.ratio {}, should be 0.001~0.9",
                    OBJDET_DETECTEDBOX_DISTINCT_RATIO);
            throw new IllegalArgumentException("invalid objdet.detectedbox.distinct.ratio, should be 0.001~0.9");
        }

        log.info("check pass");
    }
}
