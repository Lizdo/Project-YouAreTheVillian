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
private var minAttackRadius:float;
public var isDead:boolean;

public var updateID:int;
private static var currentID:int;
public static var totalID:int;
private var frameSlice:int = 10;

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
			maxHealth = 2000;
			dps = 15;
			speed = 24;
			color = TankColor;
			attackRadius = 15;
			minAttackRadius = 10;
			break;
		case AIClass.DPS:
			maxHealth = 300;
			dps = 50;
			speed = 23;
			color = DPSColor;
			attackRadius = 22;
			minAttackRadius = 15;
			break;
		case AIClass.Healer:
			maxHealth = 500;
			dps = 4;
			speed = 20;
			color = HealerColor;
			attackRadius = 20;
			minAttackRadius = 1;
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
private var pushBackStunTime:float = 0.6;
private var pushBackDistance:float;

private var pushBackStartPosition:Vector3;
private var pushBackMovementTarget:Vector3;

public function PushBack(distance:float, time:float){
	beingPushingBack = true;
	pushBackStartTime = Time.time;
	pushBacktime = time;
	pushBackDistance = distance;

	pushBackStartPosition = SnapToGround(transform.position);
	pushBackMovementTarget = SnapToGround(Vector3.MoveTowards(Position(), player.Position(), -pushBackDistance));

	yield WaitForSeconds(time + pushBackStunTime);
	beingPushingBack = false;
}


///////////////////////////
// AI
///////////////////////////

private var target:BaseController;
private var avoidingCooldown:boolean;

private static var lastTaunted:float;
private static var minimumTauntDelay:float = 10.0;

private var dpsAOEProbability:float = 0.006;
private var tankTauntProbability:float = 0.05;

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
		if (aiClass == AIClass.DPS && Random.value < dpsAOEProbability){
			AOEAttack();
		}else if (aiClass == AIClass.Tank && Random.value < tankTauntProbability && !player.taunted && (Time.time - lastTaunted > minimumTauntDelay)){
			lastTaunted = Time.time;
			Taunt();
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
	// Tank does not need to avoid player
	if (aiClass == AIClass.Tank)
		return false;
	// Preliminary Checks
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
	AOEAbilityName = AOEAbilities[Mathf.Floor(Random.value * AOEAbilities.length)];

	SpawnAOERing();
	yield WaitForSeconds(AOEDuration);

	if (PlayerInAOERadius()){
		DealAOEDamage();
	}

	AOERing.FadeOut();
	AOEText.FadeOut();
	yield WaitForSeconds(Random.value * 0.5 + 0.1);
	attackInProgress = false;	
}


private function Taunt(){
	attackInProgress = true;
	yield WaitForAnimation("Attack", 0.6, true);
	player.TauntedBy(this);

	var tauntAbility:String = TauntAbilities[Mathf.Floor(Random.value * TauntAbilities.length)];
	PopupText(tauntAbility);
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
private var AOEDamageMultiplier:float = 30.0;
private var AOERing:Ring;

private var AOEText:FixedText;
private var AOEAbilityName:String;

private var AOERingOffset:float = 5;


private function SpawnAOERing(){
	AOERing = Instantiate(Resources.Load("Ring", GameObject)).GetComponent(Ring);
	// Slight offset to the player position
	AOETargetPosition = player.Position() + Vector3(AOERingOffset * Random.value, 0.1, AOERingOffset * Random.value);

	AOERing.SetColor(AIDamageTextColor);
	AOERing.SetPositionAndRadius(AOETargetPosition, AOERadius);

	AOEText = Instantiate(Resources.Load("FixedText", GameObject)).GetComponent(FixedText);

	AOEText.guiText.text = AOEAbilityName;
	AOEText.SetColor(AIDamageTextColor);
	AOEText.SetPosition(AOETargetPosition);

	var line:Line = Instantiate(Resources.Load("Line", GameObject)).GetComponent(Line);
	var YOffset:Vector3 = Vector3(0,2,0);

	line.SetWidth(1);
	line.SetColor(color);
	line.SetPoints(transform.position+YOffset, AOETargetPosition+YOffset);
}

private function PlayerInAOERadius():boolean{
	if (Vector3.Distance(player.Position(), AOETargetPosition) < AOERadius){
		return true;
	}
	return false;
}

private function DealAOEDamage(){
	var amount:int = Mathf.Round(dps * AOEDamageMultiplier * (Random.Range(1.0, 1.25)) * CombatEfficiency());
	player.TakeDamage(amount);
	//TODO: Play hurt feedback
	print("AOEDamage To Player");

	player.AddCombatLog(AOEAbilityName);
	PopupText(AOEAbilityName + ": " + amount.ToString());
}

private function Die(){
	color = Color.gray;
	Renderer().material.color = color;
	switch (aiClass){
		case AIClass.Tank:
			DeadTankCount++;
			break;
		case AIClass.DPS:
			DeadDPSCount++;
			break;
		case AIClass.Healer:
			DeadHealerCount++;
			break;
	}
}

private function DealDamage(){
	// Reduce efficiency when more AI is Dead


	if (target == player){
		player.TakeDamage(dps * CombatEfficiency());
		if (aiClass == AIClass.DPS){
			player.AddCombatLog(DPSAbilities[Mathf.Floor(Random.value * DPSAbilities.length)]);
		}else if (aiClass == AIClass.Tank){
			player.AddCombatLog(TankAbilities[Mathf.Floor(Random.value * TankAbilities.length)]);
		}
	}else{
		target.Heal(dps * CombatEfficiency());
		player.AddCombatLog(HealerAbilities[Mathf.Floor(Random.value * HealerAbilities.length)]);
	}
}

private function CombatEfficiency():float{
	var efficiency:float = 1;

	efficiency = Mathf.Lerp(efficiency, 0.5 * efficiency,DeadTankCount/TankCount);
	efficiency = Mathf.Lerp(efficiency, 0.5 * efficiency,DeadDPSCount/DPSCount);
	efficiency = Mathf.Lerp(efficiency, 0.6 * efficiency,DeadHealerCount/HealerCount);

	return efficiency;
}

private function UpdateHealerAI(){
	target = AIWithLowestHP();
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


public static var TankCount:int;
public static var HealerCount:int;
public static var DPSCount:int;

private static var DeadTankCount:int;
private static var DeadHealerCount:int;
private static var DeadDPSCount:int;

private function AIWithLowestHP(){
	var lowestHPPercentage:float = 100000;
	var lowestHPAI:AIController;
	for (var ai:AIController in PlayerController.AIs){
		if (ai.isDead)
			continue;

		if (ai.HealthRatio() < lowestHPPercentage){
			lowestHPPercentage = ai.HealthRatio();
			lowestHPAI = ai;
		}
	}
	return lowestHPAI;
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

	if (TargetInRange() && !NeedForceUpdatePosition())
		return;


	// Simplified Position Check for Tank
	if (aiClass == AIClass.Tank){
		targetPosition = PositionForTank();
		return;
	}

	// Pathfinding For 
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



// Used for Tank, try to reposition if in the back of the player after a delay.
private var inBadPosition:boolean;
private var startTimeInBadPosition:float;
private var delayToFindNewPosition:float = 8.0;

private function NeedForceUpdatePosition():boolean{
	if (aiClass == AIClass.Tank){
		if (!player.AffectedByAbility(Ability.BaseAttack, this)){
			if (!inBadPosition){
				inBadPosition = true;
				startTimeInBadPosition = Time.time;
			}
		}else{
			inBadPosition = false;
			return false;
		}

		if (inBadPosition && (Time.time - startTimeInBadPosition) > delayToFindNewPosition){
			return true;		
		}
	}

	return false;
}


private function PositionForTank():Vector3{
	// Tank will always try to move to player's base attack range
	return SnapToGround(player.PositionInBaseAttackRange(attackRadius * targetInRangeBuffer));
}

private function UpdateMovementTargetAvoidPlayer(){
	targetPosition = FarAwayFromPlayer();
}

private function FarAwayFromTarget():Vector3{
	var distance:float = Vector3.Distance(target.Position(), Position());
	var ratio:float = -100;
	return SnapToGround(Vector3.MoveTowards(Position(), target.Position(), ratio));
}

private function FarAwayFromPlayer():Vector3{
	var distance:float = Vector3.Distance(player.Position(), Position());
	var ratio:float = -100;
	return SnapToGround(Vector3.MoveTowards(Position(), player.Position(), ratio));
}


private function FarthestPositionOnRadius():Vector3{
	var offset:Vector3 = target.Position() - Position();
	var distance = offset.magnitude;
	var ratio:float = 1 + targetInRangeBuffer * attackRadius / distance;

	return SnapToGround(Position() + ratio * offset);
}

private function ClosestPositionOnRadius():Vector3{
	var offset:Vector3 = target.Position() - Position();
	var distance = offset.magnitude;
	var ratio:float = 1 - targetInRangeBuffer * attackRadius / distance;

	return SnapToGround(Position() + ratio * offset);
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
	// If I'm the last healer, my position is always valid
	if (target == this && aiClass == AIClass.Healer)
		return true;

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

	if (distance <= attackRadius && distance >= minAttackRadius)
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

	if (distance <= attackRadius && distance >= minAttackRadius)
		return true;
	return false;
}

private var targetInRangeBuffer:float = 0.8;

private function TargetInRange(){
	if (target == this && aiClass == AIClass.Healer)
		return true;
	var distance:float = Vector3.Distance(Position(), target.Position());
	return distance >= minAttackRadius && distance <= attackRadius;
}

private function TargetTooClose(){
	var distance:float = Vector3.Distance(Position(), target.Position());
	return distance < minAttackRadius;
}

private var targetRotation:float;
private var targetPosition:Vector3;
private var yOffset:float = 0.5;

private function UpdateMovement(){
	// Still Update Pushback when dead.
	if (beingPushingBack){
		UpdatePushBack();
		return;
	}

	if (isDead)
		return;

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

	if (player.AffectedByAvatar(this)){
		speedRatio *= 0.5;
	}

	transform.position = Vector3.MoveTowards(transform.position, targetPosition, speed * Time.deltaTime * speedRatio);


	if (transform.position.y < -10 || transform.position.y > 10){
		Debug.LogError("Movement Error: Too high or too low...");
	}

}

private var TankAbilities:String[] = [
	"Thrash",
	"Maul",
	"Blood Strike",
	"Death Coil",
	"Parry",
	"Shield Wall",
	"Pummel"
];

private var TauntAbilities:String[] = [
	"Provoke",
	"Growl",
	"Death Grip"
];

private var DPSAbilities:String[] = [
	"Moonfire",
	"Mangle",
	"Pounce",
	"Cyclone",
	"Swipe",
	"Kill Shot",
	"Rapid Fire",
	"Stampede",
	"Frostbolt",
	"Frostfire Bolt",
	"Raging Blow",
	"Cleave",
	"Shadow Bolt",
	"Corruption",
	"Fel Flame",
	"Windfury Attack",
	"Lightning Bolt",
	"Shadow Blade",
	"Kidney Shot",
	"Sap",
	"Gouge",
	"Chi Burst",
	"Tiger Strikes",
	"Tiger Palm"
];

private var HealerAbilities:String[] = [
	"Flash Heal",
	"Lay on Hands",
	"Flash of Light",
	"Renew",
	"Prayer of Mending",
	"Cenarion Ward",
	"Healing Touch",
	"Rejuvenation",
	"Lifebloom",
	"Healing Surge",
	"Chain Heal",
	"Healing Rain",
	"Chi Torpedo",
	"Chi Wave",
	"Healing Sphere"
];

private var AOEAbilities:String[] = [
	"Astral Storm",
	"Death and Decay",
	"Multi-Shot",
	"Ice Trap",
	"Fire Blast",
	"Frost Nova",
	"Flamestrike",
	"Whirlwind",
	"Rain of Fire",
	"Earthquake",
	"Fan of Knives",
	"Slice and Dice"
];


private function SnapToGround(v:Vector3){
	// Add a random offset to avoid Z fight
	return Vector3(v.x, yOffset + Random.value * 0.1, v.z);
}
}
