#pragma strict

// Interface for Shared Functions

class BaseController extends MonoBehaviour{

///////////////////////////
// Public Helper Functions
///////////////////////////

protected var maxHealth:float;
protected var health:float;

public function Position():Vector3{
	return Vector3(transform.position.x, 0, transform.position.z);
}

public function Renderer():Renderer{
	if (!_renderer){
		_renderer = renderer;
		if (!_renderer)
			_renderer = transform.Find("Mesh").renderer;
	}
	return _renderer;
}

public function Radius():float{
	return Renderer().bounds.extents.magnitude;
}

public function TakeDamage(amount:float){
	health -= amount;
	if (health < 0)
		health = 0;
}

public function Heal(amount:float){
	health += amount;
	if (health > maxHealth)
		health = maxHealth;
}

private var _renderer:Renderer;
private var _animation:Animation;

//Wait for an animation to be a certain amount complete
public function WaitForAnimation(name:String, ratio:float, play:boolean){
	if (!_animation){
		_animation = animation;
		if (!_animation)
			_animation = transform.Find("Mesh").animation;
	}

    //Get the animation state for the named animation

    var anim = _animation[name];
    //Play the animation
    if (play)
    	_animation.Play(name);
 
    //Loop until the normalized time reports a value
    //greater than our ratio.  This method of waiting for
    //an animation accounts for the speed fluctuating as the
    //animation is played.
    while(anim.normalizedTime + float.Epsilon + Time.deltaTime < ratio){
        yield new WaitForEndOfFrame();
    }
 
}


}
