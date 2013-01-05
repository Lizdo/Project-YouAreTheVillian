#pragma strict

private var lifeSpan:float = 0.1;
private var lineRenderer:LineRenderer;

function Awake(){
	lineRenderer = GetComponent(LineRenderer);         	
}

function Start(){
    yield WaitForSeconds(lifeSpan);
    Destroy(gameObject);
}

function SetPoints(startPoint:Vector3, endPoint:Vector3){
    lineRenderer.SetVertexCount(2);
    lineRenderer.SetPosition(0, startPoint);
    lineRenderer.SetPosition(1, endPoint);
}

function SetColor(c:Color){
    lineRenderer.SetColors(c,c);
}

function SetWidth(w:float){
    lineRenderer.SetWidth(w,w);
}