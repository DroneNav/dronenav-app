export default function Aircraft3D({
  position = [0, 0, 0],
  heading = 0,
}) {
  return (
    <group position={position} rotation={[0, heading, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[7, 24, 3]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.3}
          side={2}
        />
      </mesh>
    </group>
  );
}