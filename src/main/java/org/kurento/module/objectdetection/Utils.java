package org.kurento.module.objectdetection;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class Utils {
    private final Logger log = LoggerFactory.getLogger(Utils.class);

    @Autowired
    private DefaultConfiguration configuration;

    /**
     * get authentication info for TURN connection
     * 
     * @param sessionId session ID
     * @return [username, credential] for TURN connection
     */
    public String[] getTurnCredInfo(String sessionId) {
        try {

            long timestamp = System.currentTimeMillis() / 1000L + 3 * 3600; // 3-hour timeout
            String turnUser = String.format("%d:%s", timestamp, sessionId);

            Mac sha1_HMAC = Mac.getInstance("HmacSHA1");
            SecretKeySpec secret_key = new SecretKeySpec(configuration.TURN_STATIC_AUTH_SECRET.getBytes(), "HmacSHA1");
            sha1_HMAC.init(secret_key);

            byte[] hash = sha1_HMAC.doFinal(turnUser.getBytes());
            String cred = Base64.getEncoder().encodeToString(hash);

            return new String[] { turnUser, cred };
        } catch (Exception e) {
            log.error("error calculating TURN info: {}", getStackTraceString(e));
        }
        return null;
    }

    /**
     * format exception info
     * 
     * @param e
     * @return
     */
    public String getStackTraceString(final Exception e) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        return sw.toString();
    }

    /**
     * combine similar objects to prevent lots of identical objects showing
     * 
     * @param frameAObjs frame a
     * @param frameBObjs frame b
     * @return combined objects
     */
    public ModelObj[] distinctObjs(final ModelObj[] frameAObjs, final ModelObj[] frameBObjs) {
        HashMap<String, List<ModelObj>> frameAObjsDict = sortByBoxName(frameAObjs);
        List<ModelObj> combinedObjs = new ArrayList<>();
        float ratio = configuration.OBJDET_DETECTEDBOX_DISTINCT_RATIO;

        for (ModelObj obj : frameBObjs) {
            if (frameAObjsDict.containsKey(obj.name) == false) {
                combinedObjs.add(obj);
                continue;
            }
            boolean newObj = true;
            for (ModelObj srcObj : frameAObjsDict.get(obj.name)) {
                if (Math.abs(srcObj.x1r - obj.x1r) < ratio && Math.abs(srcObj.y1r - obj.y1r) < ratio
                        && Math.abs(srcObj.x2r - obj.x2r) < ratio && Math.abs(srcObj.y2r - obj.y2r) < ratio) {
                    newObj = false;
                    break;
                }
            }

            if (newObj == true) {
                combinedObjs.add(obj);
            }

        }
        log.debug("frame a objs: {}, frame b objs: {}, combined objs: {}", frameAObjs.length, frameBObjs.length, combinedObjs.size());
        return combinedObjs.toArray(new ModelObj[0]);

    }

    // ============================================================================================
    // private functions
    // ============================================================================================
    private HashMap<String, List<ModelObj>> sortByBoxName(final ModelObj[] objs) {
        HashMap<String, List<ModelObj>> tmp = new HashMap<>();
        for (ModelObj obj : objs) {
            if (tmp.containsKey(obj.name) == false) {
                tmp.put(obj.name, new ArrayList<ModelObj>());
            }
            tmp.get(obj.name).add(obj);
        }
        return tmp;
    }
}
