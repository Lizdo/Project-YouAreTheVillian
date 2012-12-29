#pragma strict

private var segments:int = 32;
private var width:float = 0.8;

private var lineRenderer:LineRenderer;

function Awake(){
	lineRenderer = GetComponent(LineRenderer);	
	lineRenderer.SetWidth(width,width);
}

function SetPositionAndRadius(center:Vector3, r:float){
	var lineRenderer:LineRenderer = GetComponent(LineRenderer);	
	lineRenderer.SetVertexCount(segments+1);
	var circleVector:Vector3 = Vector3(r,0,0);
	for (var i:int = 0; i<= segments; i++){
		var position:Vector3 = center + circleVector;
		lineRenderer.SetPosition(i, position);
		circleVector = Quaternion.AngleAxis(360.0/segments, Vector3.up) * circleVector;
	}
}

function SetColor(c:Color){
	color = c;
	var semiTransparentC:Color = Color(color.r, color.g, color.b, alpha);
	lineRenderer.SetColors(semiTransparentC,semiTransparentC);
}

function Show(){
	lineRenderer.enabled = true;
}

function Hide(){
	lineRenderer.enabled = false;
}

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
}



