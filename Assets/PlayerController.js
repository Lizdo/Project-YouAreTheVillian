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
public var avatar:boolean;

///////////////////////////
// Main Updates
///////////////////////////

private var sphere:GameObject;


function Awake(){
	//Application.targetFrameRate = 30;
	mainCamera = Camera.main;
	sphere = transform.Find("Sphere").gameObject;
	sphere.renderer.enabled = false;
}

private var hint:GUIText;
private var combatLog:GUIText;

private var centerText:FadeText;

private var barEmpty:Texture;
private var barFull:Texture;

function Start () {
	AlignCameraToBack();
	maxHealth = 100000;
	health = maxHealth;
	skin = Resources.Load("GUI", GUISkin);
	var arrow:GameObject = Resources.Load("Arrow", GameObject);
	targetArrow = Instantiate(arrow, Vector3.zero, Quaternion.identity).GetComponent(GUIText);
	targetArrow.material.color = TargetArrorColor;
	SetState(State.Idle);

	hint = gameObject.Find("Hint").GetComponent(GUIText);
	hint.text = "Use WSAD to move, Left Mouse Button to drag camera, 1/2/3/4 for Abilities.";
	hint.material.color = SecondaryTextColor;

	combatLog = gameObject.Find("CombatLog").GetComponent(GUIText);
	combatLog.material.color = MinorTextColor;
	combatLogLines = new Array();
	combatLog.text = "";

	centerText = gameObject.Find("CenterText").GetComponent(FadeText);
	LevelInit();

	barEmpty = Resources.Load("LightBackground", Texture);
	barFull = Resources.Load("DarkBackground", Texture);

	barEmpty.wrapMode = TextureWrapMode.Repeat;
	barFull.wrapMode = TextureWrapMode.Repeat;
}

private var levelInitComplete:boolean;

function LevelInit(){
	centerText.SetText("G A M E    S T A R T");
	centerText.FadeIn();
	yield WaitForSeconds(3);
	centerText.FadeOut();
	yield WaitForSeconds(1);

	levelInitComplete = true;
	guiFadeStartTime = Time.time;
	guiFading = true;
	SpawnAI();

	yield WaitForSeconds(1);

	guiFading = false;


	yield WaitForSeconds(3);
	centerText.SetText("Kill All Enemys.");
	centerText.FadeIn();
	yield WaitForSeconds(3);
	centerText.FadeOut();
}

function LevelComplete(){
	centerText.SetText("V I C T O R Y");
	centerText.FadeIn();
	yield WaitForSeconds(3);
	centerText.FadeOut();
	yield WaitForSeconds(3);
	Application.LoadLevel(0);
}

function LevelFailed(){
	centerText.SetText("G A M E    O V E R");
	//TODO: Play Fail Anim...
	centerText.FadeIn();
	yield WaitForSeconds(3);
	centerText.FadeOut();
	yield WaitForSeconds(3);
	Application.LoadLevel(0);
}

private var EnrageHealthRatio:float = 0.25;


function Update () {
	if (levelFail)
		return;

	if (HealthRatio() < EnrageHealthRatio && !enraged){
		enraged = true;
		Enrage();
	}

	UpdateInput();
	UpdateTarget();
	if (state != State.UsingAbility)
		UpdateMovement();
	UpdateCamera();

	if (levelInitComplete){
		CheckVictoryCondition();
	}
}

private var EnrageFX:ParticleSystem;
private var EnrageFXOffset:Vector3 = Vector3(0,10,10);

private function Enrage(){
	Renderer().material.color = EnragedColor;

	EnrageFX = Instantiate(Resources.Load("Fire", ParticleSystem));
	EnrageFX.transform.position = transform.position + transform.rotation * EnrageFXOffset;
	EnrageFX.transform.parent = transform;

}

private var levelComplete:boolean;
private var levelFail:boolean;

private function CheckVictoryCondition(){
	if (levelComplete || levelFail)
		return;

	if (health <= 0){
		levelFail = true;
		LevelFailed();
	}

	for (var ai:AIController in AIs){
		if (!ai.isDead)
			return;
	}

	// All of them are dead.
	levelComplete = true;
	LevelComplete();
}


///////////////////////////
// Public Functions
///////////////////////////

public function AffactedByCurrentAbility(ai:AIController):boolean{
	if (Vector3.Distance(ai.Position(), Position()) > AbilityRange[currentAbility])
		return false;

	if (Position() == ai.Position())
		return true;

	// No Angle Limit
	if (AbilityAngle[currentAbility] == 0){
		return true;
	}

	var offset:Quaternion = Quaternion.LookRotation(Position() - ai.Position());
	if (Mathf.Abs(Quaternion.Angle(transform.rotation, offset)) < AbilityAngle[currentAbility]/2){
		return true;
	}

	return false;
}


public function AffectedByAvatar(ai:AIController):boolean{
	if (!avatar)
		return false;

	var distance:float = Vector3.Distance(Position(), ai.Position());
	if (distance <= AvatarRadius){
		return true;
	}
}

///////////////////////////
// GUI
///////////////////////////

private var skin:GUISkin;

private var healthBarHeight:float = 20;
private var healthBarMargin:float = 20;
private var healthBarPadding:float = 5;
private var healthBarWidth:float;

private var healthBarMajorSegments:int = 4;
private var healthBarMinorSegments:int = 5;
private var healthBarMajorSegmentWidth:float = 4;
private var healthBarMajorSegmentHeight:float = healthBarHeight - healthBarPadding;
private var healthBarMinorSegmentWidth:float = 2;
private var healthBarMinorSegmentHeight:float = healthBarHeight - healthBarPadding*2;

private var healthBarTextHeight:float = 15;
private var healthBarTextWidth:float = 200;

private var aiHPBarHeight:float = 5;
private var aiHPBarMarginX:float = 20;
private var aiHPBarMarginY:float = 100;
private var aiHPBarPadding:float = 5;
private var aiHPBarWidth:float = 100;

private var abilityButtonMargin:float = 20;
private var abilityButtonSize:float = 80;
private var abilityButtonPadding:float = 10;

private var abilityButtonKeyLabelOffsetX:float = 18;
private var abilityButtonKeyLabelOffsetY:float = 7;

private var normalFontSize:float = 12;
private var bigFontSize:float = 30;

function OnGUI () {
	if (!levelInitComplete)
		return;

	GUI.skin = skin;

	// if (GUI.Button (Rect (10,10,150,100), "I am a button")) {
	// 	print ("You clicked the button!");
	// }

	//GUI.DrawTexture(Rect(healthBarMargin,0,Screen.width,Screen.height),"This is a title");

	var bar:Rect;
	var i:int;
	var j:int;

	// Player HP

	healthBarWidth = Screen.width - healthBarMargin * 2;
	SetGuiColor(BackgroundColor());

	GUI.BeginGroup(Rect(healthBarMargin, healthBarMargin, healthBarWidth, healthBarHeight + healthBarTextHeight));

		GUI.DrawTexture(Rect(0,0,healthBarWidth, healthBarHeight), barEmpty);

		SetGuiColor(DefaultGUIColor);
	    bar = Rect(healthBarPadding, healthBarPadding,
	        health/maxHealth * (healthBarWidth - healthBarPadding * 2),
	        healthBarHeight - healthBarPadding * 2);
	    GUI.DrawTexture(bar, barFull);

	    // Player HP Bar Segments
	    SetGuiColor(HPBarSegmentColor);

	    // Major Segments

	    var position:float;
	    var ratio:float;

	    for (i = 0; i < healthBarMajorSegments+1; i++){
	    	ratio = i * (1.0/healthBarMajorSegments);
	    	position = healthBarPadding + ratio * (healthBarWidth - healthBarPadding * 2);

	    	bar = Rect(position - healthBarMajorSegmentWidth/2, healthBarPadding,
	    		healthBarMajorSegmentWidth, healthBarMajorSegmentHeight);
	    	GUI.DrawTexture(bar, barEmpty);

	    	for (j = 1; j < healthBarMinorSegments; j++){
	    		ratio = j * (1.0/healthBarMinorSegments/healthBarMajorSegments) + i * (1.0/healthBarMajorSegments);;
	    		position = healthBarPadding + ratio * (healthBarWidth - healthBarPadding * 2);

	    		bar = Rect(position - healthBarMinorSegmentWidth/2, healthBarPadding,
	    			healthBarMinorSegmentWidth, healthBarMinorSegmentHeight);
	    		GUI.DrawTexture(bar, barEmpty);
	    	}
	    }
	    

	    SetGuiColor(SecondaryTextColor);

	    if (HealthRatio() < 0.5 && HealthRatio() > 0.25){
		    ratio = 0.25;
		    position = healthBarPadding + ratio * (healthBarWidth - healthBarPadding * 2);
		    GUI.Label(Rect(position,healthBarHeight,healthBarTextWidth,healthBarTextHeight), "Rage");
	    }

	    if (HealthRatio() < 0.75 && HealthRatio() > 0.5){
		    ratio = 0.5;
		    position = healthBarPadding + ratio * (healthBarWidth - healthBarPadding * 2);
		    GUI.Label(Rect(position,healthBarHeight,healthBarTextWidth,healthBarTextHeight), "Unlock 4th Ability");	    	
	    }

	    if (HealthRatio() > 0.75){
		    ratio = 0.75;
		    position = healthBarPadding + ratio * (healthBarWidth - healthBarPadding * 2);
		    GUI.Label(Rect(position,healthBarHeight,healthBarTextWidth,healthBarTextHeight), "Unlock 3rd Ability");
	    }


	GUI.EndGroup();

	// AI HP

	var aiHPBarTotalHeight:float = AIs.length * (aiHPBarHeight+aiHPBarPadding) + aiHPBarPadding;

	SetGuiColor(BackgroundColor());
	GUI.BeginGroup(Rect(aiHPBarMarginX, aiHPBarMarginY, aiHPBarWidth, aiHPBarTotalHeight));
	GUI.DrawTexture(Rect(0,0,aiHPBarWidth, aiHPBarTotalHeight), barEmpty);

	var lineNumber:int = 0;

		for (i = 0; i < AIs.length; i++){
			var ai:AIController = AIs[i];
			if (ai.isDead){
				continue;
			}
			SetGuiColor(ai.color);
		    bar = Rect(aiHPBarPadding, aiHPBarPadding+lineNumber*(aiHPBarHeight+aiHPBarPadding),
		        ai.health/ai.maxHealth * (aiHPBarWidth - aiHPBarPadding * 2),
		        aiHPBarHeight);
		    GUI.DrawTexture(bar, barFull);		    
		    lineNumber++;
		}

	GUI.EndGroup();

	SetGuiColor(Color.white);

	// Skill Buttons
	for (i = 0; i < 4; i++){
		var r:Rect = Rect(abilityButtonMargin + i * (abilityButtonSize + abilityButtonPadding),
			Screen.height - abilityButtonMargin - abilityButtonSize,
			abilityButtonSize, abilityButtonSize);
		var buttonRect;

		var ability:Ability = i;

		if (!AbilityVisible(i))
			return;

		var t:Texture = Resources.Load(ability.ToString(), Texture);

		if (!AbilityAvailable(i)){
			SetGuiColor(Color(0.2, 0.2, 0.2, 0.2));
		}


		if (GUI.Button (r, GUIContent(ability.ToString(), t))) {
			UseAbility(i);
		}

		SetGuiColor(MinorTextColor);

		// Add Key Buttons
		if (AbilityAvailable(i)){
			buttonRect = Rect(r.x + abilityButtonKeyLabelOffsetX, r.y + abilityButtonKeyLabelOffsetY,
			 r.width, r.height);
			GUI.Label(buttonRect, (i+1).ToString());
		}else{
			// buttonRect = Rect(r.x + r.width/2, r.y + r.height/2,
			//  r.width, r.height);			
			GUI.skin.label.alignment = TextAnchor.MiddleCenter;
			GUI.skin.label.fontSize = bigFontSize;
			GUI.Label(r, CoolDownTimeString(i));
			GUI.skin.label.alignment = TextAnchor.UpperLeft;
			GUI.skin.label.fontSize = normalFontSize;
		}

		SetGuiColor(Color.white);
	}


}

private var combatLogLines:Array;
private var maxCombatLogLineCount:int = 10;

public function AddCombatLog(s:String){
	combatLogLines.Add(s);
	if (combatLogLines.length > maxCombatLogLineCount){
		combatLogLines.Shift();
	}

	var fullText:String = "";
	for (var i:int; i < combatLogLines.length; i++){
		fullText = fullText + combatLogLines[i] + "\n";
	}

	combatLog.text = fullText;
}

private var guiFadeTime:float = 1.0f;
private var guiFadeStartTime:float;
private var guiFading:boolean = true;

private function SetGuiColor(c:Color){
	if (!guiFading){
		GUI.color = c;
		return;
	}

	var alpha:float = Mathf.Lerp(0,1,(Time.time - guiFadeStartTime)/guiFadeTime);
	alpha = Mathf.Min(c.a, alpha);

	c.a = alpha;

	GUI.color = c;
}

private function BackgroundColor():Color{
	var c:Color = ColorWithHex(0x9cbcbd);
	c.a = 0.4;
	return c;
}

///////////////////////////
// Abilities
///////////////////////////

enum Ability{
	BaseAttack,
	Cleave,
	Stomp,
	Avatar
}

private var abilityTargetLocation:Vector3;

private var AbilityCastTime:float[] = [1,1.5,1.5,3];
private var abilityTransitionTime:float[] = [0.5, 0.5, 0.5, 0.5];
private var AbilityCooldownTime:float[] = [0f,10f,15f,60f];
private var AbilityLastUsed:float[] = [-100f,-100f,-100f,-100f];
private var AbilityDamage:float[] = [50f, 70f, 150f, 100f];
private var AbilityRange:float[] = [30f, 20f, 20f, 20f];
private var AbilityAngle:float[] = [180f, 120f, 0f, 0f];
private var AbilityTargetNumber:int[] = [1, 100, 100, 0];

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
		if (!ai)
			continue;
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
	if (i == 2 && HealthRatio() > 0.75)
		return false;

	if (i == 3 && HealthRatio() > 0.5)
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

private function CoolDownTimeString(i:int):String{
	var secondsRemaining:float = AbilityCooldownTime[i] - (Time.time - AbilityLastUsed[i]);

	if (secondsRemaining >= 1.0){
		var secondsInInt:int = Mathf.Floor(secondsRemaining);
		return secondsInInt.ToString();
	}

	return "";
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
	yield WaitForSeconds(abilityTransitionTime[currentAbility]);
	print(Time.time + "Ability Resolved: " + currentAbility);
	AbilityLastUsed[currentAbility] = Time.time;
	SetState(State.Idle);
}

private var AvatarDuration:float = 30;
private var AvatarRadius:float = 20;

private function ResolveAbility(){
	for (var ai:AIController in EnemyInAbilityRange()){
		DealDamageToTarget(ai);

		switch (currentAbility){
			case Ability.BaseAttack:
				break;
			case Ability.Cleave:
				break;
			case Ability.Stomp:
				ai.PushBack(10,0.4);
				break;
		}		
	}

	switch (currentAbility){
		case Ability.Avatar:
			SetAvatarState();
			yield WaitForSeconds(AvatarDuration);
			RemoveAvatarState();
			break;
	}
}

private function SetAvatarState(){
	avatar = true;
	sphere.renderer.enabled = true;
}

private function RemoveAvatarState(){
	avatar = false;
	sphere.renderer.enabled = false;
}

private function EnemyInAbilityRange():Array{
	if (AbilityTargetNumber == 0)
		return null;

	var enemyInRange:Array = new Array();
	var targetInRange:boolean;

	for (var ai:AIController in AIs){
		if (AffactedByCurrentAbility(ai)){
			if (ai == target)
				targetInRange = true;
			else
				enemyInRange.Add(ai);
		}
	}

	enemyInRange.sort();


	// Add the target if he's in range
	if (targetInRange){
		enemyInRange.Unshift(target);
	}

	// Only pick x targets
	var targetNumber:int = Mathf.Min(AbilityTargetNumber[currentAbility], enemyInRange.length);
	var returnArray:Array = new Array();

	for (var i:int = 0; i <targetNumber; i++){
		returnArray.Add(enemyInRange[i]);
	}

	return returnArray;

}

private function DealDamageToTarget(ai:AIController){
	var damageMultiplier:float = 1.0;

	if (enraged){
		damageMultiplier *= 1.2;
	}

	if (avatar){
		damageMultiplier *= 1.2;
	}

	var amount:float = AbilityDamage[currentAbility] * damageMultiplier;
	print("Damaging" + ai.ToString());
	ai.TakeDamage(amount);
	AddDamageTextOnTarget(ai, amount);
}

private function AddDamageTextOnTarget(ai:AIController, amount:float){
	var v:Vector3 = Camera.main.WorldToViewportPoint(ai.Center());
	SpawnFloatingText(amount.ToString(), v.x, v.y, PlayerDamageTextColor);
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

	var speedBonus:float = 1.0;

	if (avatar)
		speedBonus *= 1.2;

	if (enraged)
		speedBonus *= 1.2;

	if (attackAnim){
		animationState.speed = length/(AbilityCastTime[currentAbility]) * speedBonus;
	}else{
		animationState.speed = length/abilityTransitionTime[currentAbility] * speedBonus;
	}

	if (attackAnim){
		animation.CrossFade(animName);
	}else{
		animation.Play(animName);
	}
}

///////////////////////////
// Game Logic
///////////////////////////

private var AIAmount:int[] = [2,17,6];
public static var AIs:Array;

function SpawnAI(){
	var prefab:GameObject = Resources.Load("AI", GameObject);
	var ai:AIController;
	var i:int;
	AIs = new Array();

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

private var aiSpawnDistance:float = 30.0;

function RandomAIPosition():Vector3{
	var randomOffset:Vector3 = Quaternion.Euler(0, Random.value * 360, 0) * Vector3(1,0,0) * aiSpawnDistance;
	return transform.position + randomOffset;
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

private var rotateSpeed:float = 40;

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

	var speedBonus:float = 1;

	if (avatar)
		speedBonus *= 1.2;

	if (enraged)
		speedBonus *= 1.2;

	if (inputVerticalValue > 0){
		// Move Forawrd
		transform.position -= Quaternion.Euler(0,rotationY,0) * Vector3.forward * Time.deltaTime * inputVerticalValue * speed * speedBonus;
		SetState(State.MovingForward);
	}else if (inputVerticalValue < 0){
		transform.position -= Quaternion.Euler(0,rotationY,0) * Vector3.forward * Time.deltaTime * inputVerticalValue * reverseSpeed * speedBonus;
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