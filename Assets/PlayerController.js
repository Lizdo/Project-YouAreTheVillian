#pragma strict

enum State{
	Idle,
	MovingForward,
	MovingBackward,
	MovingLeft,
	MovingRight,
	UsingAbility
}

class PlayerController extends BaseController{

private var mainCamera:Camera;

public var currentAbility:Ability;
public var state:State;

private var enraged:boolean;

///////////////////////////
// Main Updates
///////////////////////////

function Awake(){
	Application.targetFrameRate = 60;
	mainCamera = Camera.main;
	SpawnAI();
}

private var hint:GUIText;

function Start () {
	AlignCameraToBack();
	maxHealth = 100000;
	health = maxHealth;
	skin = Resources.Load("GUI", GUISkin);
	var arrow:GameObject = Resources.Load("Arrow", GameObject);
	targetArrow = Instantiate(arrow, Vector3.zero, Quaternion.identity).GetComponent(GUIText);
	targetArrow.material.color = ColorWithHex(0x741909);
	SetState(State.Idle);

	hint = gameObject.Find("Hint").GetComponent(GUIText);
	hint.text = "Use WSAD to move, Left Mouse Button to drag camera, 1/2/3/4 for Abilities.";
	hint.material.color = ColorWithHex(0xe2dfd9);
}

function Update () {
	UpdateInput();
	UpdateTarget();
	if (state != State.UsingAbility)
		UpdateMovement();
	UpdateCamera();
}


///////////////////////////
// GUI
///////////////////////////

private var skin:GUISkin;

private var healthBarHeight:float = 20;
private var healthBarMargin:float = 20;
private var healthBarPadding:float = 5;
private var healthBarWidth:float;

private var aiHPBarHeight:float = 5;
private var aiHPBarMarginX:float = 20;
private var aiHPBarMarginY:float = 100;
private var aiHPBarPadding:float = 5;
private var aiHPBarWidth:float = 100;

private var abilityButtonMargin:float = 20;
private var abilityButtonSize:float = 80;
private var abilityButtonPadding:float = 10;

function OnGUI () {

	GUI.skin = skin;

	// if (GUI.Button (Rect (10,10,150,100), "I am a button")) {
	// 	print ("You clicked the button!");
	// }

	//GUI.Box(Rect(healthBarMargin,0,Screen.width,Screen.height),"This is a title");

	healthBarWidth = Screen.width - healthBarMargin * 2;
	var bar:Rect;

	// Player HP

	GUI.color = ColorWithHex(0x9cbcbd);
	GUILayout.BeginArea(Rect(healthBarMargin, healthBarMargin, healthBarWidth, healthBarHeight),  GUIStyle("BarEmpty"));

		GUI.color = ColorWithHex(0x742f15);
	    bar = Rect(healthBarPadding, healthBarPadding,
	        health/maxHealth * (healthBarWidth - healthBarPadding * 2),
	        healthBarHeight - healthBarPadding * 2);
	    GUILayout.BeginArea(bar, GUIStyle("BarFull"));
	    GUILayout.EndArea();

	GUILayout.EndArea();


	// AI HP

	var aiHPBarTotalHeight:float = AIs.length * (aiHPBarHeight+aiHPBarPadding) + aiHPBarPadding;

	GUI.color = ColorWithHex(0x9cbcbd);
	GUILayout.BeginArea(Rect(aiHPBarMarginX, aiHPBarMarginY, aiHPBarWidth, aiHPBarTotalHeight),  GUIStyle("BarEmpty"));

		for (var i:int = 0; i < AIs.length; i++){
			var ai:AIController = AIs[i];
			GUI.color = ai.color;
		    bar = Rect(aiHPBarPadding, aiHPBarPadding+i*(aiHPBarHeight+aiHPBarPadding),
		        ai.health/ai.maxHealth * (aiHPBarWidth - aiHPBarPadding * 2),
		        aiHPBarHeight);
		    GUILayout.BeginArea(bar, GUIStyle("BarFull"));
		    GUILayout.EndArea();
		}

	GUILayout.EndArea();	

	GUI.color = Color.white;

	// Skill Buttons
	for (i = 0; i < 4; i++){
		var r:Rect = Rect(abilityButtonMargin + i * (abilityButtonSize + abilityButtonPadding),
			Screen.height - abilityButtonMargin - abilityButtonSize,
			abilityButtonSize, abilityButtonSize);
		var ability:Ability = i;

		if (!AbilityVisible(i))
			return;

		var t:Texture = Resources.Load(ability.ToString(), Texture);

		if (!AbilityAvailable(i)){
			GUI.color = Color(0.2, 0.2, 0.2, 0.2);
		}

		if (GUI.Button (r, GUIContent(ability.ToString(), t))) {
			UseAbility(i);
		}

		GUI.color = Color.white;
	}


}

///////////////////////////
// Abilities
///////////////////////////

enum Ability{
	BaseAttack,
	Cleave,
	Stomp,
	Corruption
}

private var abilityTargetLocation:Vector3;

private var AbilityCastTime:float[] = [1.5,3,5,3];
private var abilityTransitionTime:float = 0.5;
private var AbilityCooldownTime:float[] = [0f,10f,20f,10f];
private var AbilityLastUsed:float[] = [-100f,-100f,-100f,-100f];
private var AbilityDamage:float[] = [100f, 100f, 100f, 100f];
private var AbilityRange:float[] = [30f, 20f, 20f, 20f];
private var AbilityAngle:float[] = [180f, 120f, 0f, 0f];
private var AbilityTargetNumber:int[] = [1, 100, 0, 0];

private var target:AIController;
private var targetArrow:GUIText;

private function UpdateTarget(){
	target = ClosestEnemiesInFront();
	if (target){
		targetArrow.enabled = true;
		var v:Vector3 = Camera.main.WorldToViewportPoint(target.Center());
		targetArrow.transform.position = Vector3(v.x, v.y + 0.02, 0);
	}else{
		targetArrow.enabled = false;
	}
}


private function ClosestEnemiesInFront():AIController{
	var closestDistance:float = 30;
	var closestAI:AIController;

	for (var ai:AIController in AIs){
		var distance:float = Vector3.Distance(ai.Position(), Position());
		if (distance < closestDistance){
			if (Position() == ai.Position())
				return ai;
			var offset:Quaternion = Quaternion.LookRotation(Position() - ai.Position());
			if (Mathf.Abs(Quaternion.Angle(transform.rotation, offset)) < 90){
				closestDistance = distance;
				closestAI = ai;
			}
		}
	}
	return closestAI;
}

private function AbilityVisible(i:int):boolean{
	return true;
}

private function AbilityAvailable(i:int):boolean{
	// TODO: Implement the other three abilities.
	if (i > 1)
		return false;

	if (!AbilityVisible(i))
		return false;

	// Another Ability In Progress
	if (state == State.UsingAbility)
		return false;

	// In CoolDown
	if (Time.time - AbilityLastUsed[i] < AbilityCooldownTime[i])
		return false;

	return true;
}

private function UseAbility(i:int){
	if (!AbilityAvailable(i))
		return;

	currentAbility = i;
	print("Using Ability: " + currentAbility);

	SetState(State.UsingAbility);

	if (target)
		abilityTargetLocation = target.Position();
	ProcessAbility();
}

private function ProcessAbility(){
	yield WaitForSeconds(AbilityCastTime[currentAbility]);
	// Deal Damage at target Location
	print(Time.time + "Ability Casted: " + currentAbility);
	ResolveAbility();
	PlayAbilityAnimation(false);
	yield WaitForSeconds(abilityTransitionTime);
	print(Time.time + "Ability Resolved: " + currentAbility);
	AbilityLastUsed[currentAbility] = Time.time;
	SetState(State.Idle);
}

private function ResolveAbility(){
	for (var ai:AIController in EnemyInAbilityRange()){
		DealDamageToTarget(ai);
	}

	switch (currentAbility){
		case Ability.BaseAttack:
			break;
		case Ability.Cleave:
			break;
	}
}

private function EnemyInAbilityRange():Array{
	if (AbilityTargetNumber == 0)
		return null;

	var enemyInRange:Array = new Array();
	var targetInRange:boolean;

	for (var ai:AIController in AIs){
		if (Vector3.Distance(ai.Position(), Position()) > AbilityRange[currentAbility])
			continue;

		var offset:Quaternion = Quaternion.LookRotation(Position() - ai.Position());
		if (Mathf.Abs(Quaternion.Angle(transform.rotation, offset)) < AbilityAngle[currentAbility]/2){
			if (ai == target)
				targetInRange = true;
			else
				enemyInRange.Add(ai);
		}
	}

	enemyInRange.sort();

	if (targetInRange){
		enemyInRange.Unshift(target);
	}

	var targetNumber:int = Mathf.Min(AbilityTargetNumber[currentAbility], enemyInRange.length);
	var returnArray:Array = new Array();

	for (var i:int = 0; i <targetNumber; i++){
		returnArray.Add(enemyInRange[i]);
	}

	return returnArray;

}

private function DealDamageToTarget(ai:AIController){
	var amount:float = AbilityDamage[currentAbility];
	print("Damaging" + ai.ToString());
	ai.TakeDamage(amount);
	AddDamageTextOnTarget(ai, amount);
}

private function AddDamageTextOnTarget(ai:AIController, amount:float){
	var v:Vector3 = Camera.main.WorldToViewportPoint(ai.Center());
	SpawnFloatingText(amount.ToString(), v.x, v.y, ColorWithHex(0x741909));
}

///////////////////////////
// Animation
///////////////////////////

private function SetState(newState:State){
	if (newState == state)
		return;
	state = newState;

	switch (state){
		case State.Idle:
			PlayAnimation("Idle");
			break;
		case State.MovingForward:
			PlayAnimation("MoveForward");
			break;
		case State.MovingBackward:
			PlayAnimation("MoveBackward");
			break;
		case State.MovingLeft:
			PlayAnimation("TurnLeft");
			break;
		case State.MovingRight:
			PlayAnimation("TurnRight");
			break;							
		case State.UsingAbility:
			PlayAbilityAnimation(true);
	}
}

private function PlayAnimation(animName:String){
	animation.CrossFade(animName);
}


private function PlayAbilityAnimation(attackAnim:boolean){
	var animName = currentAbility.ToString();

	if (!attackAnim){
		animName += "Transition";
	}

	var animationState:AnimationState = animation[animName];
	var length:float = animationState.length;

	if (attackAnim){
		animationState.speed = length/(AbilityCastTime[currentAbility]);
	}else{
		animationState.speed = length/abilityTransitionTime;
	}


	animation.CrossFade(animName);
}

///////////////////////////
// Game Logic
///////////////////////////

private var AIAmount:int[] = [2,17,6];
public static var AIs:Array = new Array();

function SpawnAI(){
	var prefab:GameObject = Resources.Load("AI", GameObject);
	var ai:AIController;
	var i:int;

	for (i = AIAmount[0] - 1; i >= 0; i--) {
		ai = Instantiate(prefab).GetComponent(AIController);
		ai.aiClass = AIClass.Tank;
		AIs.Add(ai);
	};

	for (i = AIAmount[1] - 1; i >= 0; i--) {
		ai = Instantiate(prefab).GetComponent(AIController);
		ai.aiClass = AIClass.DPS;
		AIs.Add(ai);
	};

	for (i = AIAmount[2] - 1; i >= 0; i--) {
		ai = Instantiate(prefab).GetComponent(AIController);
		ai.aiClass = AIClass.Healer;
		AIs.Add(ai);
	};

	for (i = 0; i < AIs.length; i++){
		ai = AIs[i];
		ai.transform.position = RandomAIPosition();
		ai.updateID = i;
		ai.Setup();
	}

	AIController.totalID = AIs.length;

}

private var aiSpawnDistance:float = 100.0;

function RandomAIPosition():Vector3{
	return Quaternion.Euler(0, Random.value * 360, 0) * Vector3(1,0,0) * aiSpawnDistance;
}


///////////////////////////
// Input
///////////////////////////

private var inputHorizontalValue:float;
private var inputVerticalValue:float;

private var mouseDown:boolean;
private var initMouseDownPosition:Vector2;
private var mouseDownDistanceValue:float;

private function UpdateInput () {
	inputHorizontalValue = Input.GetAxis ("Horizontal");
	inputVerticalValue = Input.GetAxis ("Vertical");	

	if (Input.GetKey(KeyCode.Mouse0)){
		if (mouseDown == false){
			initMouseDownPosition = Input.mousePosition;
			initmouseDownCameraRotationY = mainCamera.transform.rotation.eulerAngles.y;
		}
		mouseDown = true;
		mouseDownDistanceValue = -(Input.mousePosition.x - initMouseDownPosition.x)/Screen.width;
	}else{
		mouseDown = false;
	}


	if (Input.GetKey(KeyCode.Alpha1) || Input.GetKey(KeyCode.Keypad1)){
		UseAbility(0);
	}
	if (Input.GetKey(KeyCode.Alpha2) || Input.GetKey(KeyCode.Keypad2)){
		UseAbility(1);
	}
	if (Input.GetKey(KeyCode.Alpha3) || Input.GetKey(KeyCode.Keypad3)){
		UseAbility(2);
	}
	if (Input.GetKey(KeyCode.Alpha4) || Input.GetKey(KeyCode.Keypad4)){
		UseAbility(3);
	}
}


///////////////////////////
// Movement
///////////////////////////

private var speed:float = 30;
private var reverseSpeed:float = 5;	// Move backward is slower

private var rotateSpeed:float = 20;

private function UpdateMovement () {
	if (mouseDown)
		// Currently stop moving when viewing camera
		return;

	var rotationY:float = transform.rotation.eulerAngles.y;

	if (inputHorizontalValue != 0){
		rotationY += inputHorizontalValue * rotateSpeed * Time.deltaTime;
		transform.rotation = Quaternion.Euler(transform.rotation.eulerAngles.x, rotationY, transform.rotation.eulerAngles.z);
		// Move Slower when Turning
		inputVerticalValue = ((1 - Mathf.Abs(inputHorizontalValue)) * 0.5 + 0.5) * inputVerticalValue;
	}

	if (inputVerticalValue > 0){
		// Move Forawrd
		transform.position -= Quaternion.Euler(0,rotationY,0) * Vector3.forward * Time.deltaTime * inputVerticalValue * speed;
		SetState(State.MovingForward);
	}else if (inputVerticalValue < 0){
		transform.position -= Quaternion.Euler(0,rotationY,0) * Vector3.forward * Time.deltaTime * inputVerticalValue * reverseSpeed;
		SetState(State.MovingBackward);
	}else if (inputHorizontalValue < 0){
		SetState(State.MovingLeft);
	}else if (inputHorizontalValue > 0){
		SetState(State.MovingRight);
	}else{
		SetState(State.Idle);
	}

}

///////////////////////////
// Camera
///////////////////////////


enum CameraMode{
	Free,		// Camera not related to player movement
	Following,	// Camera Position follow player movement
	Relative 	// Camera Position/Rotation follow player movement
}

private var cameraMode:CameraMode;
private var targetCameraPosition:Vector3;
private var targetCameraRotation:Quaternion;

private var cameraRotateSpeed:float = 8;
private var cameraMovementSpeed:float = 5;
private var mouseDownCameraTravelSpeed:float = 180;
private var mouseDownRotateDegree:float;
private var initmouseDownCameraRotationY:float;

private var cameraDragged:boolean;
private var returnFromMouseDown:boolean;

private function UpdateCamera(){
	if (mouseDown){
		cameraMode = CameraMode.Free;
	}

	if (cameraDragged && Mathf.Abs(inputVerticalValue) > 0.1){
		returnFromMouseDown = true;
	}

	if (!mouseDown && !cameraDragged){
		cameraMode = CameraMode.Relative;
		SetDefaultCameraTarget();
	}


	var updatePosition:boolean = false;
	var updateRotation:boolean = false;
	switch (cameraMode){
		case CameraMode.Free:
			break;
		case CameraMode.Following:
			updatePosition = true;
			break;
		case CameraMode.Relative:
			updatePosition = true;
			updateRotation = true;
			break;
	}

	if (updateRotation){
		if (Quaternion.Dot(mainCamera.transform.rotation, targetCameraRotation) < 0.01){
			mainCamera.transform.rotation = targetCameraRotation;
		}else{
			mainCamera.transform.rotation = Quaternion.Lerp(mainCamera.transform.rotation, targetCameraRotation, Time.deltaTime * cameraRotateSpeed);
		}
	}

	if (updatePosition){
		if (Vector3.Distance(mainCamera.transform.position, targetCameraPosition) < 0.1){
			mainCamera.transform.position = targetCameraPosition;
		}
		else{
			// TODO: Rotate Camera around Camera Targt
			mainCamera.transform.position = Vector3.Slerp(mainCamera.transform.position, targetCameraPosition, Time.deltaTime * cameraMovementSpeed);
		}
	}

	if (mouseDown){
		cameraDragged = true;
		mouseDownRotateDegree = mouseDownDistanceValue * mouseDownCameraTravelSpeed;
		mainCamera.transform.rotation = Quaternion.Euler(defaultCameraAngle, initmouseDownCameraRotationY+mouseDownRotateDegree, 0);
		mainCamera.transform.position = transform.position + Quaternion.Euler(0, initmouseDownCameraRotationY+mouseDownRotateDegree + 180, 0) * defaultCameraOffset;
	}

	if (returnFromMouseDown){
		mouseDownRotateDegree = Mathf.Lerp(mouseDownRotateDegree, 0, cameraMovementSpeed * Time.deltaTime);
		if (Mathf.Abs(mouseDownRotateDegree) <= 1){
			returnFromMouseDown = false;
			cameraDragged = false;
			mouseDownRotateDegree = 0;
		}
		//Lerp Back Use the same Algorithm...
		mainCamera.transform.rotation = Quaternion.Euler(defaultCameraAngle, initmouseDownCameraRotationY+mouseDownRotateDegree, 0);
		mainCamera.transform.position = transform.position + Quaternion.Euler(0, initmouseDownCameraRotationY+mouseDownRotateDegree + 180, 0) * defaultCameraOffset;		
	}

}

private var defaultCameraOffset:Vector3 = Vector3(0, 70.0, 30.0);
private var defaultCameraAngle:float = 70;

private function AlignCameraToBack(){
	cameraMode = CameraMode.Relative;
	SetDefaultCameraTarget();
	SnapCameraToTarget();
}

private function SetDefaultCameraTarget(){
	var rotationY:float = transform.rotation.eulerAngles.y;
	targetCameraRotation = Quaternion.Euler(defaultCameraAngle, rotationY + 180, 0);
	targetCameraPosition = transform.position + Quaternion.Euler(0, rotationY, 0) * defaultCameraOffset;
	
}

private function SnapCameraToTarget(){
	if (targetCameraPosition != Vector3.zero){
		mainCamera.transform.position = targetCameraPosition;
	}
	mainCamera.transform.rotation = targetCameraRotation;
}

}