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
