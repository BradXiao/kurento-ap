package org.kurento.module.objectdetection;

import org.kurento.client.IceCandidate;
import org.kurento.client.MediaPipeline;
import org.kurento.client.WebRtcEndpoint;
import org.kurento.module.objdet.ObjDet;

public class UserSession {
  private WebRtcEndpoint webRtcEndpoint;
  private MediaPipeline mediaPipeline;
  private ObjDet objdet;
  private String sessionId = "";
  private String kmsSessionId = "";
  private String sdpOffer = "";
  private String[] turnInfo = null;
  private String selectedModel = "";

  // streaming parameters
  private float inferringConfi = 0.7F;
  private int boxLimit = 10;
  private int inferringDelay = 100;
  private boolean isDrawing = true;
  private String relayServer = "default";
  private String displayMode = "local";
  private long detBoxTimeStp = 0;
  private ModelObj[] lastBoxes = null;

  public String getSdpOffer() {
    return sdpOffer;
  }

  public void setSdpOffer(String sdpOffer) {
    this.sdpOffer = sdpOffer;
  }

  public UserSession() {
  }

  public WebRtcEndpoint getWebRtcEndpoint() {
    return webRtcEndpoint;
  }

  public void setWebRtcEndpoint(WebRtcEndpoint webRtcEndpoint) {
    this.webRtcEndpoint = webRtcEndpoint;
  }

  public MediaPipeline getMediaPipeline() {
    return mediaPipeline;
  }

  public void setMediaPipeline(MediaPipeline mediaPipeline) {
    this.mediaPipeline = mediaPipeline;
  }

  public void addCandidate(IceCandidate candidate) {
    webRtcEndpoint.addIceCandidate(candidate);
  }

  public ObjDet getObjdet() {
    return objdet;
  }

  public void setObjdet(ObjDet objdet) {
    this.objdet = objdet;
  }

  public String getSessionId() {
    return sessionId;
  }

  public void setSessionId(String sessionId) {
    this.sessionId = sessionId;
  }

  public String getKmsSessionId() {
    return kmsSessionId;
  }

  public void setKmsSessionId(String kmsSessionId) {
    this.kmsSessionId = kmsSessionId;
  }

  public String[] getTurnInfo() {
    return turnInfo;
  }

  public void setTurnInfo(String[] turnInfo) {
    this.turnInfo = turnInfo;
  }

  public String getSelectedModel() {
    return selectedModel;
  }

  public void setSelectedModel(String selectedModel) {
    this.selectedModel = selectedModel;
  }

  public String getRelayServer() {
    return relayServer;
  }

  public void setRelayServer(String relayServer) {
    this.relayServer = relayServer;
  }

  public String getDisplayMode() {
    return displayMode;
  }

  public void setDisplayMode(String displayMode) {
    this.displayMode = displayMode;
  }

  public int getInferringDelay() {
    return inferringDelay;
  }

  public void setInferringDelay(int inferringDelay) {
    this.inferringDelay = inferringDelay;
  }

  public int getBoxLimit() {
    return boxLimit;
  }

  public void setBoxLimit(int boxLimit) {
    this.boxLimit = boxLimit;
  }

  public float getInferringConfi() {
    return inferringConfi;
  }

  public void setInferringConfi(float inferringConfi) {
    this.inferringConfi = inferringConfi;
  }

  public boolean isDrawing() {
    return isDrawing;
  }

  public void setDrawing(boolean isDrawing) {
    this.isDrawing = isDrawing;
  }

  public long getDetBoxTimeStp() {
    return detBoxTimeStp;
  }

  public void setDetBoxTimeStp(long detBoxTimeStp) {
    this.detBoxTimeStp = detBoxTimeStp;
  }

  public ModelObj[] getLastBoxes() {
    return lastBoxes;
  }

  public void setLastBoxes(ModelObj[] lastBoxes) {
    this.lastBoxes = lastBoxes;
  }

  public void destroy() {
    if (this.objdet != null) {
      this.objdet.destroy();
    }
    if (this.mediaPipeline != null) {
      this.mediaPipeline.release();
    }
    if (this.webRtcEndpoint != null) {
      this.webRtcEndpoint.release();
    }
  }

  public void stopStrm() {
    destroy();
  }
}
