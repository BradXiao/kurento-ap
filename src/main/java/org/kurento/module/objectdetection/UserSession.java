package org.kurento.module.objectdetection;

import org.kurento.client.IceCandidate;
import org.kurento.client.MediaPipeline;
import org.kurento.client.WebRtcEndpoint;
import org.kurento.module.objdet.ObjDet;

public class UserSession {
  private WebRtcEndpoint webRtcEndpoint;
  private MediaPipeline mediaPipeline;
  private ObjDet objdet;
  private String sdpOffer = "";
  private String[] turnInfo = null;

  /** websocket session ID */
  private String sessionId = "";

  /** kms module session ID */
  private String kmsSessionId = "";

  /** user selected model */
  private String selectedModel = "";

  /** confidence threshold for objects */
  private float inferringConfi = 0.7F;

  /** maximum output objects */
  private int boxLimit = 10;

  /** inference delay between frames (in sec) */
  private int inferringDelay = 100;

  /** draw objects */
  private boolean isDrawing = true;

  /** relay server */
  private String relayServer = "default";

  /** display mode */
  private String displayMode = "local";

  /** used for calculating inference delay */
  private long detBoxTimestamp = 0;

  /** used for combining identical objects between frames */
  private ModelObj[] lastBoxes = null;

  public UserSession() {
  }

  public void addCandidate(IceCandidate candidate) {
    webRtcEndpoint.addIceCandidate(candidate);
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

  public ObjDet getObjdet() {
    return objdet;
  }

  public void setObjdet(ObjDet objdet) {
    this.objdet = objdet;
  }

  public String getSdpOffer() {
    return sdpOffer;
  }

  public void setSdpOffer(String sdpOffer) {
    this.sdpOffer = sdpOffer;
  }

  public String[] getTurnInfo() {
    return turnInfo;
  }

  public void setTurnInfo(String[] turnInfo) {
    this.turnInfo = turnInfo;
  }

  /** websocket session ID */
  public String getSessionId() {
    return sessionId;
  }

  /** websocket session ID */
  public void setSessionId(String sessionId) {
    this.sessionId = sessionId;
  }

  /** kms module session ID */
  public String getKmsSessionId() {
    return kmsSessionId;
  }

  /** kms module session ID */
  public void setKmsSessionId(String kmsSessionId) {
    this.kmsSessionId = kmsSessionId;
  }

  /** user selected model */
  public String getSelectedModel() {
    return selectedModel;
  }

  /** user selected model */
  public void setSelectedModel(String selectedModel) {
    this.selectedModel = selectedModel;
  }

  /** confidence threshold for objects */
  public float getInferringConfi() {
    return inferringConfi;
  }

  /** confidence threshold for objects */
  public void setInferringConfi(float inferringConfi) {
    this.inferringConfi = inferringConfi;
  }

  /** maximum output objects */
  public int getBoxLimit() {
    return boxLimit;
  }

  /** maximum output objects */
  public void setBoxLimit(int boxLimit) {
    this.boxLimit = boxLimit;
  }

  /** inference delay between frames (in sec) */
  public int getInferringDelay() {
    return inferringDelay;
  }

  /** inference delay between frames (in sec) */
  public void setInferringDelay(int inferringDelay) {
    this.inferringDelay = inferringDelay;
  }

  /** draw objects */
  public boolean isDrawing() {
    return isDrawing;
  }

  /** draw objects */
  public void setDrawing(boolean isDrawing) {
    this.isDrawing = isDrawing;
  }

  /** relay server */
  public String getRelayServer() {
    return relayServer;
  }

  /** relay server */
  public void setRelayServer(String relayServer) {
    this.relayServer = relayServer;
  }

  /**
   * display mode; locally means draw objects on frontend, remotely means draw objects on the streaming
   * 
   * @return
   */
  public String getDisplayMode() {
    return displayMode;
  }

  /**
   * display mode; locally means draw objects on frontend, remotely means draw objects on the streaming
   * 
   * @return
   */
  public void setDisplayMode(String displayMode) {
    this.displayMode = displayMode;
  }

  /** used for calculating inference delay */
  public long getDetBoxTimestamp() {
    return detBoxTimestamp;
  }

  /** used for calculating inference delay */
  public void setDetBoxTimestamp(long detBoxTimestamp) {
    this.detBoxTimestamp = detBoxTimestamp;
  }

  /** used for combining identical objects between frames */
  public ModelObj[] getLastBoxes() {
    return lastBoxes;
  }

  /** used for combining identical objects between frames */
  public void setLastBoxes(ModelObj[] lastBoxes) {
    this.lastBoxes = lastBoxes;
  }

  public void releaseStreamObject() {
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

}
