#pragma strict

class BaseController extends MonoBehaviour{

///////////////////////////
// Public Helper Functions
///////////////////////////

public function Position():Vector3{
	return Vector3(transform.position.x, 0, transform.position.y);
}

public function Radius():float{
	return renderer.bounds.extents.magnitude;
}


}
