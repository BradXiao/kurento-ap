package org.kurento.module.objectdetection;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

import org.kurento.module.objdet.*;
import org.kurento.client.IceCandidate;
import org.kurento.client.KurentoClient;
import org.kurento.client.MediaPipeline;
import org.kurento.client.WebRtcEndpoint;
import org.kurento.jsonrpc.JsonUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import jakarta.websocket.CloseReason;
import jakarta.websocket.Session;

@Service
public class DefaultService {
    private static final Gson gson = new GsonBuilder().create();
    private final Logger log = LoggerFactory.getLogger(DefaultService.class);
    private final ConcurrentHashMap<String, UserSession> users = new ConcurrentHashMap<>();

    @Autowired
    private KurentoClient kurento;
    @Autowired
    private Utils utils;
    @Autowired
    private DefaultConfiguration configuration;

    public void initSession(final Session session) {
        UserSession user = new UserSession();
        users.put(session.getId(), user);

        String username = session.getId();

        String[] turnInfo = utils.getTurnCredInfo(username);
        user.setTurnInfo(turnInfo);

        JsonObject msg = new JsonObject();
        msg.addProperty("id", "turnInfo");
        msg.addProperty("turnname1", configuration.TURN1_NAME);
        msg.addProperty("turnip1", configuration.TURN1_SERVER);
        msg.addProperty("turnname2", configuration.TURN2_NAME);
        msg.addProperty("turnip2", configuration.TURN2_SERVER);
        msg.addProperty("username", turnInfo[0]);
        msg.addProperty("credential", turnInfo[1]);

        sendMessage(session, msg.toString());
        log.info("{}: initSession with turn server username {}", session.getId(), turnInfo[0]);
    }

    public void initKMSSession(final Session session, final JsonObject jsonMessage) {
        log.info("{}: initKMSSession", session.getId());
        UserSession user = users.get(session.getId());

        String turnip = "";
        if (jsonMessage.get("turnserver").isJsonNull() == false) {
            String turnserver = jsonMessage.get("turnserver").getAsString();
            if (turnserver.equals(configuration.TURN1_NAME) == false
                    && turnserver.equals(configuration.TURN2_NAME) == false) {
                sendError(session, "", "Unknown TURN server!");
                return;
            } else {
                user.setRelayServer(turnserver);
                log.info("{}: select TURN server {}", session.getId(), turnserver);
            }

            if (turnserver.equals(configuration.TURN1_NAME)) {
                turnip = configuration.TURN1_INTERNAL_SERVER;
            } else if (turnserver.equals(configuration.TURN2_NAME)) {
                turnip = configuration.TURN2_INTERNAL_SERVER;
            }
        } else {
            user.setRelayServer("");
        }

        log.info("{}: init streaming", session.getId());

        MediaPipeline pipeline = kurento.createMediaPipeline();
        user.setMediaPipeline(pipeline);
        WebRtcEndpoint webRtcEndpoint = new WebRtcEndpoint.Builder(pipeline).build();
        webRtcEndpoint.setMaxVideoSendBandwidth(10000);
        webRtcEndpoint.setEncoderBitrate(10000000);

        if (turnip.equals("") == false) {
            String[] turnInfo = user.getTurnInfo();
            webRtcEndpoint
                    .setTurnUrl(String.format("%s:%s@%s", turnInfo[0], turnInfo[1], turnip));
        }

        user.setWebRtcEndpoint(webRtcEndpoint);

        ObjDet objDetFilter = new ObjDet.Builder(pipeline).build();
        webRtcEndpoint.connect(objDetFilter);

        if (user.getDisplayMode().equals("remote")) {
            objDetFilter.connect(webRtcEndpoint);
        }

        user.setObjdet(objDetFilter);
        registerEvents(session, webRtcEndpoint, objDetFilter);
        user.setSdpOffer(jsonMessage.get("sdpOffer").getAsString());

        log.info("{}: trigger KMS to init KMSSession", session.getId());
        user.getObjdet().initSession();

    }

    public void getModelNames(final Session session) {
        log.info("{}: getModelMames", session.getId());
        UserSession user = users.get(session.getId());
        log.debug("{}: trigger KMS to return model names", session.getId());
        user.getObjdet().getModelNames();
    }

    public void changeModel(final Session session, final JsonObject jsonMessage) {
        UserSession user = users.get(session.getId());
        String targetModel = jsonMessage.get("newModelName").getAsString();
        if (user.getSelectedModel().equals(targetModel)) {
            log.info("{}: change model skipped", session.getId());
            return;
        }
        log.debug("{}: trigger KMS to change model to {}", session.getId(), targetModel);
        user.getObjdet().changeModel(targetModel);
        user.setSelectedModel(targetModel);
    }

    public void setBoxLimit(final Session session, final JsonObject jsonMessage) {
        log.info("{}: set box limit", session.getId());
        UserSession user = users.get(session.getId());
        int maxNum = jsonMessage.get("maxNum").getAsInt();
        if (maxNum <= 0 || maxNum > 100) {
            log.error("{}: invalid box limit number {}", session.getId(), maxNum);
            return;
        }
        user.getObjdet().setBoxLimit(maxNum);
        user.setBoxLimit(maxNum);
        log.debug("{}: signal box limit number {} to KMS", session.getId(), maxNum);

    }

    public void setConfi(final Session session, final JsonObject jsonMessage) {
        log.info("{}: set box confidence", session.getId());
        UserSession user = users.get(session.getId());
        float confi = jsonMessage.get("confi").getAsFloat();
        if (confi <= 0 || confi > 1) {
            log.error("{}: invalid box confidence number {}", session.getId(), confi);
            return;
        }
        user.setInferringConfi(confi);
        user.getObjdet().setConfidence(confi);
        log.debug("{}: signal box confidence {} to KMS", session.getId(), confi);

    }

    public void setInferring(final Session session, final JsonObject jsonMessage) {
        log.info("{}: set inferring", session.getId());
        UserSession user = users.get(session.getId());
        if (jsonMessage.get("sw").getAsString().equals("true")) {
            user.getObjdet().startInferring();
            long timestamp = System.currentTimeMillis();
            user.setDetBoxTimestamp(timestamp);
            log.debug("{}: signal start inferring to KMS", session.getId());
        } else {
            user.getObjdet().stopInferring();
            log.debug("{}: signal stop inferring to KMS", session.getId());
        }
    }

    public void setInferringDelay(final Session session, final JsonObject jsonMessage) {
        log.info("{}: set inferring delay", session.getId());
        UserSession user = users.get(session.getId());
        int delayMs = jsonMessage.get("delayMs").getAsInt();
        if (delayMs < 100 || delayMs > 2000) {
            log.error("{}: invalid box inferring delay {} ms", session.getId(), delayMs);
            return;
        }
        user.getObjdet().setInferringDelay(delayMs);
        user.setInferringDelay(delayMs);
        log.debug("{}: signal inferring delay {} ms to KMS", session.getId(), delayMs);
    }

    public void setDrawing(final Session session, final JsonObject jsonMessage) {
        log.info("{}: set drawing", session.getId());
        UserSession user = users.get(session.getId());
        if (jsonMessage.get("sw").getAsString().equals("true")) {
            user.getObjdet().setDrawing(true, true);
            user.setDrawing(true);
            log.debug("{}: signal enable drawing to KMS", session.getId());
        } else {
            user.getObjdet().setDrawing(false, true);
            user.setDrawing(false);
            log.debug("{}: signal disable drawing to KMS", session.getId());
        }

    }

    public void setRelay(final Session session, final JsonObject jsonMessage) {
        log.info("{}: set relay server", session.getId());
        UserSession user = users.get(session.getId());
        if (jsonMessage.get("name").isJsonNull()) {
            log.info("{}: TURN server not used", session.getId());
            return;
        }
        String turnserver = jsonMessage.get("name").getAsString();
        if (turnserver.equals(configuration.TURN1_NAME) == false
                && turnserver.equals(configuration.TURN2_NAME) == false) {
            sendError(session, "", "Unknown TURN server!");
            log.error("{}: invalid relay server name {}", session.getId(), turnserver);
            return;
        } else {
            user.setRelayServer(turnserver);
            log.debug("{}: relay server {}", session.getId(), turnserver);
        }

    }

    public void setDspMode(final Session session, final JsonObject jsonMessage) {
        log.info("{}: set display mode", session.getId());
        UserSession user = users.get(session.getId());
        String mode = jsonMessage.get("mode").getAsString();
        if (mode.equals("remote") || mode.equals("local")) {
            user.setDisplayMode(mode);
            log.debug("{}: set display mode {}", session.getId(), mode);
        } else {
            log.error("{}: invalid display mode {}", session.getId(), mode);
        }

    }

    public void getSettings(final Session session) {
        log.info("{}: get settings", session.getId());

        UserSession user = users.get(session.getId());
        JsonObject settings = new JsonObject();
        settings.addProperty("id", "settings");
        settings.addProperty("confi", user.getInferringConfi());
        settings.addProperty("boxLimit", user.getBoxLimit());
        settings.addProperty("inferringDelay", user.getInferringDelay());
        settings.addProperty("isDrawing", user.isDrawing() ? "true" : "false");
        settings.addProperty("model", user.getSelectedModel());
        settings.addProperty("relay", user.getRelayServer());
        settings.addProperty("dspMode", user.getDisplayMode());
        sendMessage(session, settings.toString());
        log.debug("{}: settings = {}", session.getId(), settings.toString());
    }

    public void onIceCandidate(final Session session, final JsonObject jsonMessage) {
        JsonObject jsonCandidate = jsonMessage.get("candidate").getAsJsonObject();
        UserSession user = users.get(session.getId());
        IceCandidate candidate = new IceCandidate(jsonCandidate.get("candidate").getAsString(),
                jsonCandidate.get("sdpMid").getAsString(),
                jsonCandidate.get("sdpMLineIndex").getAsInt());
        user.addCandidate(candidate);
        log.debug("{}: on ice candidate: {}", session.getId(), jsonMessage.toString());

    }

    public void heartbeat(final Session session) {
        log.debug("{}: trigger KMS heartbeat", session.getId());
        UserSession user = users.get(session.getId());
        user.getObjdet().heartbeat();
    }

    public void stop(Session session) {
        log.info("{}: stop streaming", session.getId());
        UserSession user = users.get(session.getId());
        if (user != null) {
            user.releaseStreamObject();
        }

    }

    public void destroy(Session session) {
        log.info("{}: session is destroyed {}", session.getId(), session.getId());
        UserSession user = users.remove(session.getId());
        if (user != null) {
            user.releaseStreamObject();
        }
        try {
            session.close(new CloseReason(CloseReason.CloseCodes.NORMAL_CLOSURE, "Close"));
        } catch (Exception e) {
            log.error("Cannot close session: {}", utils.getStackTraceString(e));
        }

    }

    public void sendError(Session session, String state, final String textMessage) {
        JsonObject response = new JsonObject();
        response.addProperty("id", "error");
        response.addProperty("state", state);
        response.addProperty("message", textMessage);
        sendMessage(session, response.toString());
    }

    public void sendMessage(Session session, final String jsonMessage) {
        log.debug("{}: Send message: {}", session.getId(), jsonMessage);
        synchronized (session) {

            try {
                session.getBasicRemote().sendText(jsonMessage);
            } catch (Exception e) {
                log.error("{}: Cannot send message: {} ({})", session.getId(), jsonMessage,
                        utils.getStackTraceString(e));
            }

        }
    }
    // ==============================================================================================================
    // private
    // ==============================================================================================================

    private void registerEvents(final Session session, WebRtcEndpoint webRtcEndpoint, ObjDet objDetFilter) {
        log.info("{}: register event", session.getId());
        webRtcEndpoint.addIceCandidateFoundListener(event -> {
            JsonObject response = new JsonObject();
            response.addProperty("id", "iceCandidate");
            response.add("candidate", JsonUtils.toJsonObject(event.getCandidate()));
            sendMessage(session, response.toString());
            log.debug("{}: send ice candidate found ", session.getId(), response.toString());
        });

        webRtcEndpoint.addConnectionStateChangedListener(event -> {
            log.info("{}: state changed to {}", session.getId(), event.getNewState());
            if (event.getNewState().toString().equals("CONNECTED")) {
                sendMessage(session, "{\"id\":\"connected\"}");
            }
        });

        objDetFilter.addsessionInitStateListener(event -> {
            log.info("{}: initStateEvent", session.getId());
            JsonObject jsonObj = gson.fromJson(event.getStateJSON(), JsonObject.class);
            log.debug("{}: initStateEvent: {}", session.getId(), event.getStateJSON());
            if (jsonObj.get("state").getAsString().equals("000")) {
                UserSession user = users.get(session.getId());
                user.setKmsSessionId(jsonObj.get("sessionId").getAsString());
                user.setSelectedModel(jsonObj.get("defaultModel").getAsString());
                log.info("{}: init with default model {}", session.getId(), user.getSelectedModel());
                startStreaming(session, user.getSdpOffer());
            } else if (jsonObj.get("state").getAsString().equals("E005")) {
                log.error("{}: {} model not available", session.getId(), jsonObj.get("defaultModel").getAsString());
                sendError(session, "E004", "The resource is insufficient due to too many users online, please try again later.");
            } else {
                log.error("{}: init session error: {}", session.getId(), jsonObj.toString());
                sendError(session, "E005", "Unknown error while starting streaming");
            }
        });

        objDetFilter.addmodelChangedListener(event -> {
            log.info("{}: modelChangedEvent", session.getId());
            JsonObject jsonObj = gson.fromJson(event.getChangedInfoJSON(), JsonObject.class);
            log.debug("{}: modelChangedEvent: {}", session.getId(), event.getChangedInfoJSON());
            if (jsonObj.get("state").getAsString().equals("000")) {
                UserSession user = users.get(session.getId());
                user.setSelectedModel(jsonObj.get("targetModel").getAsString());
                log.info("{}: switch to target model {}", session.getId(), user.getSelectedModel());
            } else if (jsonObj.get("state").getAsString().equals("E006")) {
                log.error("{}: {} model not available", session.getId(), jsonObj.get("targetModel").getAsString());
                sendError(session, "E004", "The resource is insufficient due to too many users online, please try again later.");
            } else {
                log.error("{}: change model error: {}", session.getId(), jsonObj.toString());
                sendError(session, "E006", "Unknown error while chaning model");
            }
        });

        objDetFilter.adderrorMessageListener(event -> {
            log.error("{}: error message from KMS, {}", session.getId(), event.getMsgJSON());
            sendError(session, "E007", "Unexpected error in streaming server!");
        });

        objDetFilter.addmodelNamesEventListener(event -> {
            log.info("{}: modelNamesEvent", session.getId());
            log.debug("{}: modelNamesEvent: {}", session.getId(), event.getModelNamesJSON());
            JsonArray jsonObj = gson.fromJson(event.getModelNamesJSON(), JsonArray.class);
            JsonObject modelNames = new JsonObject();
            modelNames.addProperty("id", "modelNames");
            modelNames.add("names", jsonObj);
            sendMessage(session, modelNames.toString());
        });

        objDetFilter.addboxDetectedListener(event -> {
            UserSession user = users.get(session.getId());

            synchronized (user) {

                long timestamp = System.currentTimeMillis();
                if (timestamp - user.getDetBoxTimestamp() < configuration.OBJDET_DETECTEDBOX_SPEED_MILLISEC) {
                    log.debug("{}: ignore detected objects due to inference delay", session.getId());
                    return;
                }
                user.setDetBoxTimestamp(timestamp);
                log.debug("{}: box detected: {}", session.getId(), event.getObjectJSON());
                JsonObject message = new JsonObject();
                message.addProperty("id", "boxDetected");
                String data = "";
                if (configuration.OBJDET_DETECTEDBOX_DISTINCT == true) {
                    log.debug("{}: box detected: distinct check", session.getId());
                    ModelObj[] objs = gson.fromJson(event.getObjectJSON(), ModelObj[].class);
                    if (user.getLastBoxes() != null) {
                        ModelObj[] lastObjs = user.getLastBoxes();
                        data = gson.toJson(utils.distinctObjs(lastObjs, objs));
                    } else {
                        data = event.getObjectJSON();
                    }
                    user.setLastBoxes(objs);
                } else {
                    data = event.getObjectJSON();
                }
                message.addProperty("data", data);
                sendMessage(session, message.toString());

                if (user.isDrawing() && user.getDisplayMode().equals("local")) {
                    JsonObject message2 = new JsonObject();
                    message2.addProperty("id", "boxDetectedForCanvas");
                    message2.addProperty("data", event.getObjectJSON());
                    sendMessage(session, message2.toString());
                }
            }

        });

    }

    private void startStreaming(final Session session, final String sdpOffer) {
        log.info("{}: start streaming", session.getId());
        UserSession user = users.get(session.getId());
        String sdpAnswer = user.getWebRtcEndpoint().processOffer(sdpOffer);
        JsonObject response = new JsonObject();
        response.addProperty("id", "sdpAnswer");
        response.addProperty("sdpAnswer", sdpAnswer);
        sendMessage(session, response.toString());
        user.setLastBoxes(null);
        user.getWebRtcEndpoint().gatherCandidates();

        //// apply default settings
        user.setInferringConfi(configuration.OBJDET_DEFAULT_CONFIDENCE);
        user.setBoxLimit(configuration.OBJDET_DEFAULT_BOXLIMIT);
        user.setDrawing(configuration.OBJDET_DEFAULT_DRAWBOX);
        user.setInferringDelay(configuration.OBJDET_DETECTEDBOX_SPEED_MILLISEC);

        user.getObjdet().setConfidence(configuration.OBJDET_DEFAULT_CONFIDENCE);
        user.getObjdet().setBoxLimit(configuration.OBJDET_DEFAULT_BOXLIMIT);
        user.getObjdet().setDrawing(configuration.OBJDET_DEFAULT_DRAWBOX, true);
        user.getObjdet().setInferringDelay(configuration.OBJDET_DETECTEDBOX_SPEED_MILLISEC);

        user.getObjdet().startInferring();

    }
}
