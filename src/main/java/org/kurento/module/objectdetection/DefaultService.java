package org.kurento.module.objectdetection;

import org.springframework.stereotype.Service;

import java.io.IOException;
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

import jakarta.websocket.Session;

@Service
public class DefaultService {
    @Autowired
    private KurentoClient kurento;
    @Autowired
    private Utils utils;
    @Autowired
    private DefaultConfiguration configuration;

    private static final Gson gson = new GsonBuilder().create();

    private final Logger log = LoggerFactory.getLogger(DefaultService.class);

    private final ConcurrentHashMap<String, UserSession> users = new ConcurrentHashMap<>();

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
    }

    public void initKMSSession(final Session session, JsonObject jsonMessage) {
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

        user.getObjdet().initSession();

    }

    public void getModelNames(final Session session) {
        UserSession user = users.get(session.getId());
        user.getObjdet().getModelNames();
    }

    public void changeModel(final Session session, JsonObject jsonMessage) {
        UserSession user = users.get(session.getId());

        user.getObjdet().changeModel(jsonMessage.get("newModelName").getAsString());
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
        UserSession user = users.get(session.getId());
        user.getObjdet().heartbeat(user.getKmsSessionId());
    }

    public void stop(Session session) {
        UserSession user = users.remove(session.getId());
        if (user != null) {
            user.destroy();
        }
    }

    public void sendError(Session session, String message) {
        JsonObject response = new JsonObject();
        response.addProperty("id", "error");
        response.addProperty("message", message);
        sendMessage(session, response.toString());

    }

    public void sendMessage(Session session, String message) {
        synchronized (session) {

            try {
                session.getBasicRemote().sendText(message);
            } catch (IOException e) {
                // TODO Auto-generated catch block
                e.printStackTrace();
            }

        }
    }
    // ==============================================================================================================
    // private
    // ==============================================================================================================

    private void registerEvents(Session session, WebRtcEndpoint webRtcEndpoint, ObjDet objDetFilter) {
        webRtcEndpoint.addIceCandidateFoundListener(event -> {
            JsonObject response = new JsonObject();
            response.addProperty("id", "iceCandidate");
            response.add("candidate", JsonUtils.toJsonObject(event.getCandidate()));
            sendMessage(session, response.toString());
        });
        webRtcEndpoint.addConnectionStateChangedListener(event -> {
            log.info("{}", event.getNewState());
            if (event.getNewState().toString().equals("CONNECTED")) {
                sendMessage(session, "{\"id\":\"connected\"}");
            }
        });

        objDetFilter.addsessionInitStateListener(event -> {
            JsonObject jsonObj = gson.fromJson(event.getStateJSON(), JsonObject.class);
            if (jsonObj.get("state").getAsString().equals("000")) {
                UserSession user = users.get(session.getId());
                user.setKmsSessionId(jsonObj.get("sessionId").getAsString());
                startStreaming(session, user.getSdpOffer());
            }
        });

        objDetFilter.adderrorMessageListener(event -> {
            log.error("Error message from KMS, {}", event.getMsgJSON());
        });

        objDetFilter.addmodelNamesEventListener(event -> {
            JsonArray jsonObj = gson.fromJson(event.getModelNamesJSON(), JsonArray.class);
            JsonObject modelNames = new JsonObject();
            modelNames.addProperty("id", "modelNames");
            modelNames.add("names", jsonObj);
            sendMessage(session, modelNames.toString());
        });

    }

    private void startStreaming(final Session session, String sdpOffer) {

        UserSession user = users.get(session.getId());

        String sdpAnswer = user.getWebRtcEndpoint().processOffer(sdpOffer);
        user.getObjdet().startInferring();
        user.getObjdet().setIsDraw(true);
        JsonObject response = new JsonObject();
        response.addProperty("id", "sdpAnswer");
        response.addProperty("sdpAnswer", sdpAnswer);
        sendMessage(session, response.toString());

        user.getWebRtcEndpoint().gatherCandidates();

    }
}
