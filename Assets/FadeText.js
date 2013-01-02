#pragma strict

function Awake() {
	
}

function Update () {
	if (!fadingIn && !fadingOut)
		return;

	var alpha:float;

	if (fadingIn){
		alpha = Mathf.Lerp(0, 1, (Time.time - fadeStartTime)/fadeTime);
		if (alpha >= 1)
			fadingIn = false;
	}else{
		alpha = Mathf.Lerp(1, 0, (Time.time - fadeStartTime)/fadeTime);
		if (alpha <= 0)
			fadingOut = false;
	}

	guiText.material.color.a = alpha;
}

private var fadeTime:float = 1.0f;
private var fadingIn:boolean;
private var fadingOut:boolean;
private var fadeStartTime:float;

function FadeIn(){
	//guiText.material.color.a = 0;
	fadingIn = true;
	fadingOut = false;
	fadeStartTime = Time.time;
}

function FadeOut(){
	//guiText.material.color.a = 1;
	fadingOut = true;
	fadingIn = false;
	fadeStartTime = Time.time;
}

function SetText(s:String){
	guiText.text = s;
}