#pragma strict

class PlayerController extends BaseController{

private var mainCamera:Camera;
private var health:float = 10000;

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
}

function Update () {
	UpdateInput();
	UpdateMovement();
	UpdateCamera();
}


///////////////////////////
// Public Helper Functions
///////////////////////////


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

private var cameraRotateSpeed:float = 0.02;
private var cameraMovementSpeed:float = 1;
private var mouseDownCameraTravelSpeed:float = 180;
private var initmouseDownCameraRotationY:float;

private function UpdateCamera(){
	if (mouseDown){
		cameraMode = CameraMode.Following;
	}else{
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
			mainCamera.transform.rotation = Quaternion.Slerp(mainCamera.transform.rotation, targetCameraRotation, Time.time * cameraRotateSpeed);
		}
	}

	if (updatePosition){
		if (Vector3.Distance(mainCamera.transform.position, targetCameraPosition) < 0.1){
			mainCamera.transform.position = targetCameraPosition;
		}
		else{
			mainCamera.transform.position = Vector3.Lerp(mainCamera.transform.position, targetCameraPosition, Time.time * cameraMovementSpeed);
		}
	}

	if (mouseDown){
		var degreeToRotate:float = mouseDownDistanceValue * mouseDownCameraTravelSpeed;
		mainCamera.transform.rotation = Quaternion.Euler(defaultCameraAngle, initmouseDownCameraRotationY+degreeToRotate, 0);
	}

}

private var defaultCameraOffset:Vector3 = Vector3(0, 50.0, 40.0);
private var defaultCameraAngle:float = 35;

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