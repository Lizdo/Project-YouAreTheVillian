#pragma strict

class PlayerController extends BaseController{

private var mainCamera:Camera;

enum State{
	Moving,
	UsingAbility
}

private var currentAbility:Ability;
private var state:State;

private var enraged:boolean;

///////////////////////////
// Main Updates
///////////////////////////

function Awake(){
	Application.targetFrameRate = 60;
	mainCamera = Camera.main;
	SpawnAI();
}

function Start () {
	AlignCameraToBack();
	maxHealth = 100000;
	health = maxHealth;
	skin = Resources.Load("GUI", GUISkin);
	var arrow:GameObject = Resources.Load("Arrow", GameObject);
	targetArrow = Instantiate(arrow, Vector3.zero, Quaternion.identity).GetComponent(GUIText);
	targetArrow.material.color = ColorWithHex(0x741909);
	state = State.Moving;
}

function Update () {
	UpdateInput();
	UpdateTarget();
	if (state == State.Moving)
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
private var aiHPBarMarginY:float = 200;
private var aiHPBarPadding:float = 5;
private var aiHPBarWidth:float = 100;

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
			var offset:Quaternion = Quaternion.LookRotation(Position() - ai.Position());
			if (Mathf.Abs(Quaternion.Angle(transform.rotation, offset)) < 100){
				closestDistance = distance;
				closestAI = ai;
			}
		}
	}
	return closestAI;
}

private function AbilityAvailable(i:int):boolean{
	// Another Ability In Progress444
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
	state = State.UsingAbility;
	currentAbility = i;
	print("Using Ability: " + currentAbility);
	if (target)
		abilityTargetLocation = target.Position();
	ProcessAbility();
}

private function ProcessAbility(){
	yield WaitForSeconds(AbilityCastTime[currentAbility]);
	// Deal Damage at target Location
	print(Time.time + "Ability Casted: " + currentAbility);
	ResolveAbility();
	yield WaitForSeconds(abilityTransitionTime);
	print(Time.time + "Ability Resolved: " + currentAbility);
	AbilityLastUsed[currentAbility] = Time.time;
	state = State.Moving;
}

private function ResolveAbility(){
	switch (currentAbility){
		case Ability.BaseAttack:
			if (!target)
				return;
			if (Vector3.Distance(target.transform.position, transform.position) < AbilityRange[currentAbility]){
				DealDamageToTarget(target);
			}
	}
}

private function DealDamageToTarget(ai:AIController){
	var amount:float = AbilityDamage[currentAbility];
	print("Damaging" + ai.ToString());
	ai.TakeDamage(amount);
	AddDamageTextOnTarget(ai, amount);
}

private function AddDamageTextOnTarget(ai:AIController, amount:float){
	var v:Vector3 = Camera.main.WorldToViewportPoint(ai.Center());
	SpawnFloatingText(amount.ToString(), v.x, v.y, Color.red);
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
	}else{
		transform.position -= Quaternion.Euler(0,rotationY,0) * Vector3.forward * Time.deltaTime * inputVerticalValue * reverseSpeed;
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

private var returnFromMouseDown:boolean;

private function UpdateCamera(){
	if (mouseDown){
		cameraMode = CameraMode.Following;
	}else{
		if (cameraMode == CameraMode.Following){
			returnFromMouseDown = true;
		}
		cameraMode = CameraMode.Relative;
		SetDefaultCameraTarget();
	}

	var updatePosition:boolean = false;
	var updateRotation:boolean = false;
	switch (cameraMode){
		case CameraMode.Free:
			return;
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
		mouseDownRotateDegree = mouseDownDistanceValue * mouseDownCameraTravelSpeed;
		mainCamera.transform.rotation = Quaternion.Euler(defaultCameraAngle, initmouseDownCameraRotationY+mouseDownRotateDegree, 0);
		mainCamera.transform.position = transform.position + Quaternion.Euler(0, initmouseDownCameraRotationY+mouseDownRotateDegree + 180, 0) * defaultCameraOffset;
	}

	if (returnFromMouseDown){
		mouseDownRotateDegree = Mathf.Lerp(mouseDownRotateDegree, 0, cameraMovementSpeed * Time.deltaTime);
		if (Mathf.Abs(mouseDownRotateDegree) <= 1){
			returnFromMouseDown = false;
			mouseDownRotateDegree = 0;
		}
		//Lerp Back Use the same Algorithm...
		mainCamera.transform.rotation = Quaternion.Euler(defaultCameraAngle, initmouseDownCameraRotationY+mouseDownRotateDegree, 0);
		mainCamera.transform.position = transform.position + Quaternion.Euler(0, initmouseDownCameraRotationY+mouseDownRotateDegree + 180, 0) * defaultCameraOffset;		
	}

}

private var defaultCameraOffset:Vector3 = Vector3(0, 70.0, 30.0);
private var defaultCameraAngle:float = 50;

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