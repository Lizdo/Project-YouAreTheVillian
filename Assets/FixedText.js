#pragma strict

private var position:Vector3;

private var startFadeOutTime:float;
private var fadeOutTime:float = 0.5;
private var alpha:float = 0.5;
private var fadingOut:boolean;
private var color:Color;

function FadeOut(){
    fadingOut = true;
    startFadeOutTime = Time.time;
}

function Update(){
    if (fadingOut){
        alpha = Mathf.Lerp(0.5, 0, (Time.time - startFadeOutTime)/fadeOutTime);
        SetColor(color);
        if (alpha <= 0.01){
            Destroy(gameObject);
        }
    }

    var v:Vector3 = Camera.main.WorldToViewportPoint(position);
    transform.position.x = v.x;
    transform.position.y = v.y;
}

function SetPosition(p:Vector3){
    position = p;
}

function SetColor(c:Color){
    color = c;
    var semiTransparentC:Color = Color(c.r, c.g, c.b, alpha);
    guiText.material.color = semiTransparentC;
}