package org.kurento.module.objectdetection;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class Utils {

    @Autowired
    private DefaultConfiguration configuration;

    public String[] getTurnCredInfo(String username) {
        try {

            long timestamp = System.currentTimeMillis() / 1000L + 3 * 3600; // 3-hour timeout
            String turnUser = String.format("%d:%s", timestamp, username);

            Mac sha1_HMAC = Mac.getInstance("HmacSHA1");
            SecretKeySpec secret_key = new SecretKeySpec(configuration.TURN_STATIC_AUTH_SECRET.getBytes(), "HmacSHA1");
            sha1_HMAC.init(secret_key);

            byte[] hash = sha1_HMAC.doFinal(turnUser.getBytes());
            String cred = Base64.getEncoder().encodeToString(hash);

            return new String[] { turnUser, cred };
        } catch (Exception e) {

            e.printStackTrace();
        }
        return null;
    }

    public String getStackTraceString(final Exception e) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        e.printStackTrace(pw);
        return sw.toString();
    }

    public ModelObj[] distinctObjs(final ModelObj[] beforeObjs, final ModelObj[] afterObjs) {
        HashMap<String, List<ModelObj>> beforeObjsDict = sortByBoxName(beforeObjs);
        List<ModelObj> passObjs = new ArrayList<>();
        for (ModelObj obj : afterObjs) {
            if (beforeObjsDict.containsKey(obj.name) == false) {
                passObjs.add(obj);
                continue;
            }
            int pixelTh = configuration.OBJDET_DETECTEDBOX_DISTINCT_PIXEL;
            boolean newObj = true;
            for (ModelObj srcObj : beforeObjsDict.get(obj.name)) {
                if (Math.abs(srcObj.x1 - obj.x1) < pixelTh && Math.abs(srcObj.y1 - obj.y1) < pixelTh
                        && Math.abs(srcObj.x2 - obj.x2) < pixelTh && Math.abs(srcObj.y2 - obj.y2) < pixelTh) {
                    newObj = false;
                    break;
                }
            }

            if (newObj == true) {
                passObjs.add(obj);
            }

        }

        return passObjs.toArray(new ModelObj[0]);

    }

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
