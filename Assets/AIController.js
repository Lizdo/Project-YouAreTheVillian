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
private var isDead:boolean = false;

public var updateID:int;
private static var currentID:int;
public static var totalID:int;

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
	if (currentID == updateID){
		//Once per second
		SlowUpdate();
	}

	UpdateAI();
	UpdateMovement();
}

function SlowUpdate(){
	currentID++;
	if (currentID >= totalID)
		currentID = 0;

	if (isDead)
		return;

	UpdateMovementTargetSlow();
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
			attackRadius = 10;
			break;
		case AIClass.DPS:
			health = 500;
			dps = 30;
			speed = 25;
			color = ColorWithHex(0x6587a3);
			attackRadius = 20;
			break;
		case AIClass.Healer:
			health = 800;
			dps = 10;
			speed = 10;
			color = ColorWithHex(0x56a362);
			attackRadius = 15;
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


///////////////////////////
// AI
///////////////////////////

private var target:BaseController;

private function UpdateAI(){
	if (health <= 0){
		isDead = true;
		Die();
	}

	if (isDead)
		return;

	switch (aiClass){
		case AIClass.Tank:
			UpdateTankAI();
			break;
		case AIClass.DPS:
			UpdateDPSAI();
			break;
		case AIClass.Healer:
			UpdateHealerAI();
			break;
	}
}

private function Die(){
	color = Color.gray;
	renderer.material.color = color;
	//TODO: Add some timed event
}

private function UpdateHealerAI(){
	if (target == null)
		target = RandomAI();
}

private function UpdateTankAI(){
	target = player;
}

private function UpdateDPSAI(){
	target = player;
}

private function RandomAI():AIController{
	var ai:AIController;
	do{
		var randomIndex:int = Random.Range(0, PlayerController.AIs.length);
		ai = PlayerController.AIs[randomIndex];
	}while(ai == this);
	return ai;
}

///////////////////////////
// Movement
///////////////////////////


// TODO: Use Area Graph Instead

private var AdjucentOffsets:Array = new Array(
	Vector3(0,0,1),
	Vector3(1,0,1),
	Vector3(1,0,0),
	Vector3(-1,0,1),
	Vector3(0,0,-1),
	Vector3(1,0,-1),
	Vector3(-1,0,0),
	Vector3(-1,0,-1)
);

private function UpdateMovementTargetSlow(){
	if (!target || (TargetInRange() && !TargetTooClose()))
		return;

	// Try to find an un-occupied target position here
	var positionOnRadius:Vector3 = ClosestPositionOnRadius();
	targetPosition = positionOnRadius;

	if (!TargetPositionOccupied())
		return;

	// Check Adjucent 8 Slots...
	for (var i:int = 0; i < 8; i++){
		for (var j:int = 1; j < 6; j++){
			var offset:Vector3 = AdjucentOffsets[i];
			targetPosition = positionOnRadius + offset * j * 0.8;
			if (TargetPositionIsValid() && !TargetPositionOccupied())
				return;
		}
	}

	// Find on the other side:
	positionOnRadius = FarthestPositionOnRadius();
	targetPosition = positionOnRadius;

	if (!TargetPositionOccupied())
		return;

	// Check Adjucent 8 Slots...
	for (i = 0; i < 8; i++){
		for (j = 1; j < 6; j++){
			offset = AdjucentOffsets[i];
			targetPosition = positionOnRadius + offset * j * 0.8;
			if (TargetPositionIsValid() && !TargetPositionOccupied())
				return;
		}
	}

	// No Position Available, wait next turn
	print("Target Position Not Found");
	targetPosition = Vector3.zero;
}

private function FarthestPositionOnRadius():Vector3{
	var distance:float = Vector3.Distance(target.Position(), Position());
	var ratio:float = 1 + targetInRangeBuffer * attackRadius / distance;
	return SnapToGround(Vector3.Lerp(Position(), target.Position(), ratio));
}

private function ClosestPositionOnRadius():Vector3{
	var distance:float = Vector3.Distance(target.Position(), Position());
	var ratio:float = 1 - targetInRangeBuffer * attackRadius / distance;
	return SnapToGround(Vector3.Lerp(Position(), target.Position(), ratio));
}

private function TargetPositionOccupied():boolean{
	for (var ai:AIController in PlayerController.AIs){
		if (ai.isDead || ai == this || ai.targetPosition == Vector3.zero)
			continue;
		var distance:float = Vector3.Distance(ai.targetPosition, targetPosition);
		if (distance <= 1.5)
			return true;
	}
	return false;
}

private function TargetPositionIsValid(){
	var distance:float = Vector3.Distance(targetPosition, target.Position());
	if (distance <= attackRadius && distance > attackRadius * targetTooCloseRatio)
		return true;
	return false;
}

private var targetInRangeBuffer:float = 0.8;
private var targetTooCloseRatio:float = 0.4;

private function TargetInRange(){
	var distance:float = Vector3.Distance(Position(), target.Position());
	return distance <= attackRadius;
}

private function TargetTooClose(){
	var distance:float = Vector3.Distance(Position(), target.Position());
	return distance < attackRadius * targetTooCloseRatio;
}

private var targetRotation:float;
private var targetPosition:Vector3;
private var yOffset:float = 0.5;

private function UpdateMovement(){
	RotateTowardTarget();
	MoveTowardTarget();
}

private function RotateTowardTarget(){
	transform.rotation = Quaternion.LookRotation(target.Position() - Position());
}

private function MoveTowardTarget(){
	// Wait until the next slow update
	if (targetPosition == Vector3.zero)
		return;

	// var distance:float = Vector3.Distance(transform.position, targetPosition);
	// if (distance > attackRadius * 0.9){
	// 	transform.position = Vector3.MoveTowards(transform.position, targetPosition, speed * Time.deltaTime);
	// }

	// if (distance < attackRadius * 0.4){
	// 	transform.position = Vector3.MoveTowards(transform.position, targetPosition, -speed * Time.deltaTime);		
	// }

	transform.position = Vector3.MoveTowards(transform.position, targetPosition, speed * Time.deltaTime);


	if (transform.position.y < 0 || transform.position.y > 10){
		Debug.LogError("Movement Error");
	}

}

private function SnapToGround(v:Vector3){
	// Add a random offset to avoid Z fight
	return Vector3(v.x, yOffset + Random.value * 0.1, v.z);
}
}