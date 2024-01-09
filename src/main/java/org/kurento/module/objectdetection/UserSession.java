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

  public void destroy() {
    this.objdet.destroy();
    this.mediaPipeline.release();
  }

}
