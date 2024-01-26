package org.kurento.module.objectdetection;

/** detected object class */
public class ModelObj {
    public int x1;
    public int y1;
    public int x2;
    public int y2;

    /** x1 / imgWidth */
    public float x1r;

    /** y1 / imgHeight */
    public float y1r;

    /** x2 / imgWidth */
    public float x2r;

    /** y2 / imgHeight */
    public float y2r;

    public String name;
    public float confi;
}
