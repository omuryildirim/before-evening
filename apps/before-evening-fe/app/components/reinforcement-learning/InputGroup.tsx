import type React from "react";
import type { ChangeEvent } from "react";

interface Props {
	id: string;
	label: string | React.ReactNode;
	value: string | number;
	onChange: (value: ChangeEvent<HTMLInputElement>) => void;
	disabled?: boolean;
	type?: string;
}

interface ReadOnlyProps {
	id: string;
	label: string;
	value: string | number;
	readonly: true;
}

export const InputGroup = (props: Props | ReadOnlyProps) => {
	if ((props as ReadOnlyProps).readonly) {
		return (
			<div className="flex flex-col gap-2 mt-2 mb-4">
				<label htmlFor={props.id} className="input-label">
					{props.label}:
				</label>
				<input
					id={props.id}
					className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
					value={props.value}
					readOnly
					disabled
				/>
			</div>
		);
	}

	const { id, label, value, onChange, disabled, type } = props as Props;

	const inputType = type || "text";
	const isDisabled = disabled || false;

	if (inputType === "checkbox") {
		return (
			<div className="flex gap-2 mt-2">
				<label htmlFor={id} className="input-label">
					{label}:
				</label>
				<input
					id={id}
					type="checkbox"
					checked={value}
					onChange={(e) => onChange(e)}
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 mt-2 mb-4">
			<label htmlFor={id} className="input-label">
				{label}:
			</label>
			<input
				id={id}
				className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
				value={value}
				onChange={(e) => onChange(e)}
				disabled={isDisabled}
				type={inputType}
			/>
		</div>
	);
};
