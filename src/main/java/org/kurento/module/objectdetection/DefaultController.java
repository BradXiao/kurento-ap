package org.kurento.module.objectdetection;

import java.io.IOException;
import java.lang.reflect.Field;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Controller;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;

import jakarta.websocket.CloseReason;
import jakarta.websocket.EndpointConfig;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;

@Controller
@ServerEndpoint(value = "/objdet")
public class DefaultController implements ApplicationContextAware {

    private static ApplicationContext applicationContext;
    private static final Gson gson = new GsonBuilder().create();
    private static final Logger log = LoggerFactory.getLogger(DefaultController.class);

    @Autowired
    private Utils utils;

    private Session session;
    private DefaultService service;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        DefaultController.applicationContext = applicationContext;
    }

    @OnMessage
    public void onMessage(String message) {

        JsonObject jsonMessage = gson.fromJson(message, JsonObject.class);
        log.debug("Incoming message: {}", jsonMessage);
        try {
            switch (jsonMessage.get("id").getAsString()) {
                case "initSession":
                    service.initSession(session);
                    break;
                case "initKMSSession":
                    service.initKMSSession(session, jsonMessage);
                    break;
                case "getModelNames":
                    service.getModelNames(session);
                    break;
                case "changeModel":
                    service.changeModel(session, jsonMessage);
                    break;
                case "setConfi":
                    service.setConfi(session, jsonMessage);
                    break;
                case "setBoxLimit":
                    service.setBoxLimit(session, jsonMessage);
                    break;
                case "setInferring":
                    service.setInferring(session, jsonMessage);
                    break;
                case "setInferringDelay":
                    service.setInferringDelay(session, jsonMessage);
                    break;
                case "setDrawing":
                    service.setDrawing(session, jsonMessage);
                    break;
                case "setRelay":
                    service.setRelay(session, jsonMessage);
                    break;
                case "getSettings":
                    service.getSettings(session);
                    break;
                case "setDspMode":
                    service.setDspMode(session, jsonMessage);
                    break;
                case "stop":
                    service.stop(session);
                    break;
                case "destroy":
                    service.destroy(session);
                    break;
                case "onIceCandidate":
                    service.onIceCandidate(session, jsonMessage);
                    break;
                case "heartbeat":
                    service.heartbeat(session);
                    break;
                default:
                    service.sendError(session, "E001",
                            "Invalid message with id " + jsonMessage.get("id").getAsString());
                    break;
            }

        } catch (Exception e) {
            String msg = utils.getStackTraceString(e);
            log.error("{}: error handling messages: {}", session.getId(), msg);
            service.sendError(session, "unexpected", msg);
            service.destroy(session);
        }

    }

    @OnOpen
    public void onOpen(Session session, EndpointConfig endpointConfig) {
        this.session = session;
        this.service = DefaultController.applicationContext.getBean(DefaultService.class);
        try {
            Field field = session.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(session, UUID.randomUUID().toString());
        } catch (Exception e) {
            e.printStackTrace();
        }
        log.info("{}: Websocket connection established.", session.getId());

    }

    @OnClose
    public void onClose(CloseReason closeReason) {
        service.stop(session);
        log.info("{}: Websocket connection closed.", session.getId());
    }

    @OnError
    public void onError(Throwable throwable) throws IOException {
        this.session.close(new CloseReason(CloseReason.CloseCodes.UNEXPECTED_CONDITION, throwable.getMessage()));
        log.error("{}: Websocket connection error. ({})", session.getId(), throwable.getMessage());
    }
}