#pragma strict

// Interface for Shared Functions

class BaseController extends MonoBehaviour{

///////////////////////////
// Public Helper Functions
///////////////////////////

public var maxHealth:float;
public var health:float;

// Cached reference
private var _renderer:Renderer;
private var _animation:Animation;


static function ColorWithHex(hex:int){
    // 0xRRGGBB
    var r:float = ((hex & 0xFF0000) >> 16)/255.0;
    var g:float = ((hex & 0xFF00) >> 8)/255.0;
    var b:float = (hex & 0xFF)/255.0;
    return Color(r,g,b,1.0);
}

public function SpawnFloatingText(text:String, x: float, y: float, color:Color){
    x = Mathf.Clamp(x,0.05,0.95); // clamp position to screen to ensure
    y = Mathf.Clamp(y,0.05,0.9);  // the string will be visible

    var prefab:GameObject = Resources.Load("FloatingText", GameObject);
    var t:FloatingText = Instantiate(prefab,Vector3(x,y,0),Quaternion.identity).GetComponent(FloatingText);
    t.guiText.text = text;
    t.color = color;
}

public function Position():Vector3{
	return Vector3(transform.position.x, 0, transform.position.z);
}

public function Renderer():Renderer{
	if (!_renderer){
		_renderer = renderer;
		if (!_renderer && transform.Find("Mesh"))
			_renderer = transform.Find("Mesh").renderer;
        if (!_renderer && transform.Find("Player"))
            _renderer = transform.Find("Player").renderer;
	}
	return _renderer;
}

public function Radius():float{
	return Renderer().bounds.extents.magnitude;
}

public function Center():Vector3{
	return Renderer().bounds.center;
}

public function TakeDamage(amount:float){
	//var v:Vector3 = Camera.main.WorldToViewportPoint(Center());
	//SpawnFloatingText(amount.ToString(), v.x, v.y, Color.red);
	health -= amount;
	if (health < 0)
		health = 0;
}

public function Heal(amount:float){
	health += amount;
	if (health > maxHealth)
		health = maxHealth;
}

public function HealthRatio():float{
    return health/maxHealth;
}


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

///////////////////////////
// Color Definitions
///////////////////////////

public static var PlayerDamageTextColor:Color = ColorWithHex(0x43464f);
public static var AIDamageTextColor:Color = ColorWithHex(0x741909);

public static var TankColor:Color = ColorWithHex(0xa33625);
public static var DPSColor:Color = ColorWithHex(0x454674);
public static var HealerColor:Color = ColorWithHex(0x5f8757);
public static var DeadColor:Color = Color.gray;

public static var EnragedColor:Color = ColorWithHex(0xa33625);

public static var HPBarSegmentColor:Color = ColorWithHex(0x27292f);

public static var TargetArrorColor:Color = PlayerDamageTextColor;

public static var PrimaryTextColor:Color = ColorWithHex(0xe2dfd9);
public static var SecondaryTextColor:Color = ColorWithHex(0xbac0bf);
public static var MinorTextColor:Color = ColorWithHex(0x7a7e7e);

public static var DefaultGUIColor:Color = ColorWithHex(0x742f15);
public static var DefaultGUIBackgroundColor:Color = ColorWithHex(0xbec5c5);





}
