#pragma strict

enum AIClass{
	Tank,
	DPS,
	Healer
}

class AIController extends BaseController implements System.IComparable{

public var aiClass:AIClass;


private var dps:float;
private var speed:float;
public var color:Color;
private var attackRadius:float;
public var isDead:boolean;

public var updateID:int;
private static var currentID:int;
public static var totalID:int;
private var frameSlice:int = 3;

private var player:PlayerController;

///////////////////////////
// Main Updates
///////////////////////////

function Awake (){
	player = FindObjectOfType(PlayerController);
}

function Start () {
	health = maxHealth;
}

function Update () {
	// if (currentID == updateID){
	// 	//Once per second
	// 	SlowUpdate();
	// }

	if (Time.frameCount % frameSlice == updateID % frameSlice){
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

	// See what to add here.
	UpdateMovementTargetSlow();
}


///////////////////////////
// Setup
///////////////////////////

public function Setup(){
	switch (aiClass){
		case AIClass.Tank:
			maxHealth = 1000;
			dps = 15;
			speed = 10;
			color = TankColor;
			attackRadius = 10;
			break;
		case AIClass.DPS:
			maxHealth = 500;
			dps = 30;
			speed = 12;
			color = DPSColor;
			attackRadius = 20;
			break;
		case AIClass.Healer:
			maxHealth = 800;
			dps = 10;
			speed = 10;
			color = HealerColor;
			attackRadius = 8;
			break;
	}
	Renderer().material.color = color;
}


///////////////////////////
// Public Functions
///////////////////////////


public function CompareTo(other:Object) : int{
 	if (!(other instanceof AIController)) return;
 	var otherAI:AIController = other;

 	var myDistance:float = Vector3.Distance(Position(), player.Position());
 	var otherDistance:float = Vector3.Distance(otherAI.Position(), player.Position()); 	
     return myDistance.CompareTo(otherDistance);
}



private var beingPushingBack:boolean;
private var pushBackStartTime:float;
private var pushBacktime:float;
private var pushBackDistance:float;

private var pushBackStartPosition:Vector3;
private var pushBackMovementTarget:Vector3;

public function PushBack(distance:float, time:float){
	beingPushingBack = true;
	pushBackStartTime = Time.time;
	pushBacktime = time;
	pushBackDistance = distance;

	pushBackStartPosition = transform.position;
	pushBackMovementTarget = Vector3.MoveTowards(transform.position, player.Position(), -pushBackDistance);

	yield WaitForSeconds(time);
	beingPushingBack = false;
}


///////////////////////////
// AI
///////////////////////////

private var target:BaseController;
private var avoidingCooldown:boolean;

private function UpdateAI(){
	if (health <= 0){
		isDead = true;
		Die();
	}

	if (isDead)
		return;

	if (beingPushingBack)
		return;

	var needAvoidanceFromPlayer:boolean = NeedAvoidance();

	if (player.state != State.UsingAbility){
		StopCoroutine("StopAvoidingPlayer");
		avoidingPlayer = false;
		avoidingCooldown = false;
	}

	if (!needAvoidanceFromPlayer && avoidingPlayer && !avoidingCooldown){
		StartCoroutine("StopAvoidingPlayer");
	}

	if (needAvoidanceFromPlayer && !avoidingPlayer){
		if (Random.value < 0.05){
			// Add a delay to the avoidance, now it should happen around after 0.1 second
			avoidingPlayer = true;
		}	
	}

	// Base Attack
	if (!avoidingPlayer && !attackInProgress && PositionIsValid()){
		if (aiClass == AIClass.DPS && Random.value < 0.01){
			AOEAttack();
		}else{
			Attack();
		}
	}

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

private var avoidanceCooldown:float = 2; // Continue to avoid after the delay

private function StopAvoidingPlayer(){
	avoidingCooldown = true;
	yield WaitForSeconds(avoidanceCooldown);
	avoidingPlayer = false;
	avoidingCooldown = false;
}

private function NeedAvoidance():boolean{
	// Preliminary Checks
	if (target != player)
		return false;
	if (player.state != State.UsingAbility)
		return false;
	if (player.currentAbility <= 0)
		return false;

	// Check Distance
	if (player.AffactedByCurrentAbility(this)){
		return true;
	}

	return false;
}

private var attackInProgress:boolean = false;

private function Attack(){
	attackInProgress = true;
	yield WaitForAnimation("Attack", 0.6, true);
	DealDamage();
	//yield WaitForAnimation("Attack", 0.99, false);
	yield WaitForSeconds(Random.value * 0.5 + 0.1);
	attackInProgress = false;
}

private function AOEAttack(){
	attackInProgress = true;
	yield WaitForAnimation("Attack", 0.6, true);

	SpawnAOERing();
	yield WaitForSeconds(AOEDuration);

	if (PlayerInAOERadius()){
		DealAOEDamage();
	}

	AOERing.FadeOut();

	yield WaitForSeconds(Random.value * 0.5 + 0.1);
	attackInProgress = false;	
}

private function PopupText(text:String){
	var v:Vector3 = Camera.main.WorldToViewportPoint(Position());
	SpawnFloatingText(text, v.x, v.y, AIDamageTextColor);
}

private var AOETargetPosition:Vector3;
private var AOERadius:float = 10.0;
private var AOEDuration:float = 3;
private var AOEDamageMultiplier:float = 4.0;
private var AOERing:Ring;

private var AOERingOffset:float = 5;


private function SpawnAOERing(){
	AOERing = Instantiate(Resources.Load("Ring", GameObject)).GetComponent(Ring);
	// Slight offset to the player position
	AOETargetPosition = player.Position() + Vector3(AOERingOffset * Random.value, 0.1, AOERingOffset * Random.value);

	AOERing.SetColor(color);
	AOERing.SetPositionAndRadius(AOETargetPosition, AOERadius);
}

private function PlayerInAOERadius():boolean{
	if (Vector3.Distance(player.Position(), AOETargetPosition) < AOERadius){
		return true;
	}
	return false;
}

private function DealAOEDamage(){
	var amount:float = dps * AOEDamageMultiplier;
	player.TakeDamage(amount);
	//TODO: Play hurt feedback
	print("AOEDamage To Player");
	PopupText("Critical Damge: " + amount.ToString());
}

private function Die(){
	color = Color.gray;
	Renderer().material.color = color;
	//TODO: Add some timed event
}

private function DealDamage(){
	if (target == player){
		player.TakeDamage(dps);
	}else{
		target.Heal(dps);
	}
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

private var avoidingPlayer:boolean;

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
	if (!target)
		return;

	if (avoidingPlayer){
		UpdateMovementTargetAvoidPlayer();
		return;
	}

	if (TargetInRange() && !TargetTooClose())
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


private function UpdateMovementTargetAvoidPlayer(){
	// Move To the other side
	var positionOnRadius:Vector3 = FarthestPositionOnRadius();
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

	// Move Out
	targetPosition = FarAwayFromPlayer();
}

private function FarAwayFromPlayer():Vector3{
	var distance:float = Vector3.Distance(player.Position(), Position());
	var ratio:float = -100;
	return SnapToGround(Vector3.MoveTowards(Position(), player.Position(), ratio));
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

private function PositionIsValid(){
	if (!target || targetPosition == Vector3.zero)
		return false;
	var distance:float = Vector3.Distance(Position(), target.Position());

	if (player.state == State.UsingAbility && target == player){
		if (player.Position() == Position())
			return false;
		var offset:Quaternion = Quaternion.LookRotation(player.Position() - Position());
		if (Quaternion.Dot(player.transform.rotation, offset) < 0){
			return false;
		}
	}

	if (distance <= attackRadius && distance > attackRadius * targetTooCloseRatio)
		return true;
	return false;	
}

private function TargetPositionIsValid(){
	if (!target || targetPosition == Vector3.zero)
		return false;
	var distance:float = Vector3.Distance(targetPosition, target.Position());

	if (player.state == State.UsingAbility && target == player){
		var offset:Quaternion = Quaternion.LookRotation(player.Position() - targetPosition);
		if (Quaternion.Dot(player.transform.rotation, offset) < 0){
			return false;
		}
	}

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
	if (beingPushingBack){
		UpdatePushBack();
		return;
	}

	RotateTowardTarget();
	MoveTowardTarget();
}

private function UpdatePushBack(){
	var currentTimeRatio:float = (Time.time - pushBackStartTime)/pushBacktime;
	transform.position = Vector3.Lerp(pushBackStartPosition, pushBackMovementTarget, currentTimeRatio);
}

private function RotateTowardTarget(){
	if (!target)
		return;

	if (target.Position() == Position())
		return;
	
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

	var speedRatio:float = 1;
	if (avoidingPlayer){
		speedRatio *= 0.5;
	}

	transform.position = Vector3.MoveTowards(transform.position, targetPosition, speed * Time.deltaTime * speedRatio);


	if (transform.position.y < -10 || transform.position.y > 10){
		//Debug.LogError("Movement Error");
	}

}

private function SnapToGround(v:Vector3){
	// Add a random offset to avoid Z fight
	return Vector3(v.x, yOffset + Random.value * 0.1, v.z);
}
}
