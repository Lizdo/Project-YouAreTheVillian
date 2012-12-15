#pragma strict


private var mainCamera:Camera;

///////////////////////////
// Main Updates
///////////////////////////

private function Awake(){
	mainCamera = Camera.main;
}

private function Start () {
	AlignCameraToBack();
}

private function Update () {
	UpdateCamera();
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
private var cameraRotateSpeed:float = 0.1;
private var cameraMovementSpeed:float = 1;

private function UpdateCamera(){
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

	SetDefaultCameraTarget();

	if (updateRotation){
		mainCamera.transform.rotation = Quaternion.Slerp(mainCamera.transform.rotation, targetCameraRotation, Time.time * cameraRotateSpeed);
	}

	if (updatePosition){
		mainCamera.transform.position = Vector3.Lerp(mainCamera.transform.position, targetCameraPosition, Time.time * cameraMovementSpeed);
	}

}

private var defaultCameraOffset:Vector3 = Vector3(0, 50.0, 40.0);
private var defaultCameraAngle:float = 35;

private function AlignCameraToBack(){
	cameraMode = CameraMode.Relative;
	SetDefaultCameraTarget();
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