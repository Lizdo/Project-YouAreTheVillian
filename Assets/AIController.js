#pragma strict

enum AIClass{
	Tank,
	DPS,
	Healer
}

class AIController extends BaseController{

public var aiClass:AIClass;

private var health:float;
private var dps:float;
private var speed:float;
private var color:Color;
private var attackRadius:float;

private var player:PlayerController;

///////////////////////////
// Main Updates
///////////////////////////

function Awake (){
	player = FindObjectOfType(PlayerController);
}

function Start () {
}

function Update () {
	UpdateAI();
	UpdateMovement();
}

///////////////////////////
// Setup
///////////////////////////

public function Setup(){
	switch (aiClass){
		case AIClass.Tank:
			health = 1000;
			dps = 15;
			speed = 20;
			color = ColorWithHex(0xa33625);
			attackRadius = 5;
			break;
		case AIClass.DPS:
			health = 500;
			dps = 30;
			speed = 25;
			color = ColorWithHex(0x6587a3);
			attackRadius = 10;
			break;
		case AIClass.Healer:
			health = 800;
			dps = 10;
			speed = 10;
			color = ColorWithHex(0x56a362);
			attackRadius = 10;
			break;
	}
	renderer.material.color = color;
}

static function ColorWithHex(hex:int){
    // 0xRRGGBB
    var r:float = ((hex & 0xFF0000) >> 16)/255.0;
    var g:float = ((hex & 0xFF00) >> 8)/255.0;
    var b:float = (hex & 0xFF)/255.0;
    return Color(r,g,b,1.0);
}


///////////////////////////
// Public Functions
///////////////////////////

public function Position(){
	return Vector3(transform.position.x, 0, transform.position.y);
}

///////////////////////////
// AI
///////////////////////////

private var target:BaseController;

private function UpdateAI(){
	target = player;
}

///////////////////////////
// Movement
///////////////////////////

private var targetRotation:float;
private var targetPosition:Vector3;
private var yOffset:float = 0.5;

private function UpdateMovement(){
	RotateTowardTarget();
	MoveTowardTarget();
	SnapToGround();
}

private function RotateTowardTarget(){
	transform.LookAt(target.transform);
}

private function MoveTowardTarget(){
	var distance:float = Vector3.Distance(Position(), target.Position());
	if (distance > attackRadius * 0.8){
		transform.position = Vector3.MoveTowards(transform.position, target.transform.position, speed * Time.deltaTime);
	}
}

private function SnapToGround(){
	transform.position = Vector3(transform.position.x, yOffset, transform.position.z);
}
}