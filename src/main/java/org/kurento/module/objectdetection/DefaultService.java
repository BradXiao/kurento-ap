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
import com.google.gson.JsonObject;

import jakarta.websocket.Session;

@Service
public class DefaultService {
    @Autowired
    private KurentoClient kurento;

    private final Logger log = LoggerFactory.getLogger(DefaultService.class);

    private final ConcurrentHashMap<String, UserSession> users = new ConcurrentHashMap<>();

    public void start(final Session session, JsonObject jsonMessage) {

        UserSession user = new UserSession();
        MediaPipeline pipeline = kurento.createMediaPipeline();
        user.setMediaPipeline(pipeline);
        WebRtcEndpoint webRtcEndpoint = new WebRtcEndpoint.Builder(pipeline).build();
        user.setWebRtcEndpoint(webRtcEndpoint);

        user.setSessionId(session.getId());
        // test
        ObjDet objDetFilter = new ObjDet.Builder(pipeline).build();
        objDetFilter.setIsDraw(true);
        webRtcEndpoint.connect(objDetFilter);
        objDetFilter.connect(webRtcEndpoint);

        user.setObjdet(objDetFilter);
        users.put(session.getId(), user);

        registerEvents(session, webRtcEndpoint);

        String sdpOffer = jsonMessage.get("sdpOffer").getAsString();
        String sdpAnswer = webRtcEndpoint.processOffer(sdpOffer);

        JsonObject response = new JsonObject();
        response.addProperty("id", "sdpAnswer");
        response.addProperty("sdpAnswer", sdpAnswer);
        sendMessage(session, response.toString());

        webRtcEndpoint.gatherCandidates();
        objDetFilter.startInferring();

    }

    public void onIceCandidate(final Session session, JsonObject jsonMessage) {
        JsonObject jsonCandidate = jsonMessage.get("candidate").getAsJsonObject();
        UserSession user = users.get(session.getId());
        IceCandidate candidate = new IceCandidate(jsonCandidate.get("candidate").getAsString(),
                jsonCandidate.get("sdpMid").getAsString(),
                jsonCandidate.get("sdpMLineIndex").getAsInt());
        user.addCandidate(candidate);

    }

    private void registerEvents(Session session, WebRtcEndpoint webRtcEndpoint) {
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
}
