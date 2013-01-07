#pragma strict

private var initPosition:Vector3;
private var targetPosition:Vector3;
private var duration:float = 0.8;
private var startTime:float;
private var color:Color;

function Start(){
	initPosition = transform.position;
	startTime = Time.time;
	color = renderer.material.color;
}

function Update () {
	var ratio:float = (Time.time - startTime) / duration;
	transform.Rotate(Vector3.forward * Time.deltaTime * 120);
	transform.position = Vector3.Lerp(initPosition, targetPosition, ratio);

	if (ratio >= 1){
		Destroy(gameObject);
	}

	renderer.material.color.a = Mathf.Lerp(0, 1, ratio-0.2);
}

function SetTarget(t:Vector3){
	targetPosition = t;
}
