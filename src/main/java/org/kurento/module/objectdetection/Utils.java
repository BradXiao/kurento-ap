package org.kurento.module.objectdetection;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Base64;

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
}
