package org.kurento.module.objectdetection;

import org.kurento.client.KurentoClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

@Configuration
public class DefaultConfiguration {

    @Value("${kms.url}")
    public String KMS_URL;

    @Value("${objdet.default.confidence}")
    public float OBJDET_DEFAULT_CONFIDENCE;
    @Value("${objdet.default.boxlimit}")
    public int OBJDET_DEFAULT_BOXLIMIT;
    @Value("${objdet.default.drawbox}")
    public boolean OBJDET_DEFAULT_DRAWBOX;

    @Value("${turn1.internal.sever}")
    public String TURN1_INTERNAL_SERVER;
    @Value("${turn1.server}")
    public String TURN1_SERVER;
    @Value("${turn1.name}")
    public String TURN1_NAME;

    @Value("${turn2.internal.sever}")
    public String TURN2_INTERNAL_SERVER;
    @Value("${turn2.server}")
    public String TURN2_SERVER;
    @Value("${turn2.name}")
    public String TURN2_NAME;

    @Value("${turn.static-auth-secret}")
    public String TURN_STATIC_AUTH_SECRET;

    @Value("${objdet.detectedbox.speed.millisec}")
    public int OBJDET_DETECTEDBOX_SPEED_MILLISEC;

    @Value("${objdet.detectedbox.distinct}")
    public boolean OBJDET_DETECTEDBOX_DISTINCT;

    @Value("${objdet.detectedbox.distinct.pixel}")
    public int OBJDET_DETECTEDBOX_DISTINCT_PIXEL;

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

}
