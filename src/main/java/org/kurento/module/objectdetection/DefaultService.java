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
        msg.addProperty("turnserver", configuration.TURN_SERVER);
        msg.addProperty("username", turnInfo[0]);
        msg.addProperty("credential", turnInfo[1]);

        sendMessage(session, msg.toString());
        log.info("{}: initSession with turn server username {}", session.getId(), turnInfo[0]);
    }

    public void initKMSSession(final Session session, JsonObject jsonMessage) {
        log.info("{}: initKMSSession", session.getId());
        UserSession user = users.get(session.getId());
        MediaPipeline pipeline = kurento.createMediaPipeline();
        user.setMediaPipeline(pipeline);
        WebRtcEndpoint webRtcEndpoint = new WebRtcEndpoint.Builder(pipeline).build();

        String[] turnInfo = user.getTurnInfo();
        webRtcEndpoint
                .setTurnUrl(String.format("%s:%s@%s", turnInfo[0], turnInfo[1], configuration.TURN_INTERNAL_SREVER));
        user.setWebRtcEndpoint(webRtcEndpoint);

        // test
        ObjDet objDetFilter = new ObjDet.Builder(pipeline).build();
        webRtcEndpoint.connect(objDetFilter);
        objDetFilter.connect(webRtcEndpoint);

        user.setObjdet(objDetFilter);
        registerEvents(session, webRtcEndpoint, objDetFilter);
        user.setSdpOffer(jsonMessage.get("sdpOffer").getAsString());

        log.debug("{}: trigger KMS to init KMSSession", session.getId());
        user.getObjdet().initSession();

    }

    public void getModelNames(final Session session) {
        log.info("{}: getModelMames", session.getId());
        UserSession user = users.get(session.getId());
        log.debug("{}: trigger KMS to return model names", session.getId());
        user.getObjdet().getModelNames();
    }

    public void changeModel(final Session session, JsonObject jsonMessage) {
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

    public void setBoxLimit(final Session session, JsonObject jsonMessage) {
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

    public void setConfi(final Session session, JsonObject jsonMessage) {
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

    public void setInferring(final Session session, JsonObject jsonMessage) {
        log.info("{}: set inferring", session.getId());
        UserSession user = users.get(session.getId());
        if (jsonMessage.get("sw").getAsString().equals("true")) {
            user.getObjdet().startInferring();
            log.debug("{}: signal start inferring to KMS", session.getId());
        } else {
            user.getObjdet().stopInferring();
            log.debug("{}: signal stop inferring to KMS", session.getId());
        }
    }

    public void setInferringDelay(final Session session, JsonObject jsonMessage) {
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

    public void setDrawing(final Session session, JsonObject jsonMessage) {
        log.info("{}: set drawing", session.getId());
        UserSession user = users.get(session.getId());
        if (jsonMessage.get("sw").getAsString().equals("true")) {
            user.getObjdet().setIsDraw(true, true);
            user.setDrawing(true);
            log.debug("{}: signal enable drawing to KMS", session.getId());
        } else {
            user.getObjdet().setIsDraw(false, true);
            user.setDrawing(false);
            log.debug("{}: signal disable drawing to KMS", session.getId());
        }

    }

    public void setRelay(final Session session, JsonObject jsonMessage) {
        log.info("{}: set relay server", session.getId());
        UserSession user = users.get(session.getId());
        String relayName = jsonMessage.get("name").getAsString();
        if (relayName.equals("defaut")) {
            user.setRelayServer(relayName);
            log.debug("{}: relay server {}", session.getId(), relayName);
        } else {
            log.error("{}: invalid relay server name {}", session.getId(), relayName);
        }

    }

    public void setDspMode(final Session session, JsonObject jsonMessage) {
        log.info("{}: set display mode", session.getId());
        UserSession user = users.get(session.getId());
        String mode = jsonMessage.get("mode").getAsString();
        if (mode.equals("remote")) {
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

    public void onIceCandidate(final Session session, JsonObject jsonMessage) {
        JsonObject jsonCandidate = jsonMessage.get("candidate").getAsJsonObject();
        UserSession user = users.get(session.getId());
        IceCandidate candidate = new IceCandidate(jsonCandidate.get("candidate").getAsString(),
                jsonCandidate.get("sdpMid").getAsString(),
                jsonCandidate.get("sdpMLineIndex").getAsInt());
        user.addCandidate(candidate);

    }

    public void heartbeat(final Session session) {
        log.debug("{}: trigger KMS heartbeat", session.getId());
        UserSession user = users.get(session.getId());
        user.getObjdet().heartbeat(user.getKmsSessionId());
    }

    public void stop(Session session) {
        log.info("{}: stop streaming", session.getId());
        UserSession user = users.get(session.getId());
        if (user != null) {
            user.destroy();
        }

    }

    public void destroy(Session session) {
        log.info("{}: session is destroyed {}", session.getId(), session.getId());
        UserSession user = users.remove(session.getId());
        if (user != null) {
            user.destroy();
        }
        try {
            session.close(new CloseReason(CloseReason.CloseCodes.NORMAL_CLOSURE, "Close"));
        } catch (Exception e) {
            log.error("Cannot close session: {}", utils.getStackTraceString(e));
        }

    }

    public void sendError(Session session, String state, String textMessage) {
        JsonObject response = new JsonObject();
        response.addProperty("id", "error");
        response.addProperty("state", state);
        response.addProperty("message", textMessage);
        sendMessage(session, response.toString());
    }

    public void sendMessage(Session session, String jsonMessage) {
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

    private void registerEvents(Session session, WebRtcEndpoint webRtcEndpoint, ObjDet objDetFilter) {
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
            } else {
                // todo
            }
        });

        objDetFilter.adderrorMessageListener(event -> {
            log.error("Error message from KMS, {}", event.getMsgJSON());
            // todo
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

    }

    private void startStreaming(final Session session, String sdpOffer) {
        log.info("{}: start streaming", session.getId());
        UserSession user = users.get(session.getId());
        String sdpAnswer = user.getWebRtcEndpoint().processOffer(sdpOffer);
        JsonObject response = new JsonObject();
        response.addProperty("id", "sdpAnswer");
        response.addProperty("sdpAnswer", sdpAnswer);
        sendMessage(session, response.toString());

        user.getWebRtcEndpoint().gatherCandidates();

    }
}
