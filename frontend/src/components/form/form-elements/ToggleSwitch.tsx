"use client";
import React, { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Switch from "../switch/Switch";

export default function ToggleSwitch() {
  // State for each switch
  const [defaultSwitch, setDefaultSwitch] = useState(true);
  const [checkedSwitch, setCheckedSwitch] = useState(true);
  const [grayDefaultSwitch, setGrayDefaultSwitch] = useState(true);
  const [grayCheckedSwitch, setGrayCheckedSwitch] = useState(true);

  return (
    <ComponentCard title="Toggle switch input">
      <div className="flex gap-4">
        <Switch
          label="Default"
          checked={defaultSwitch}
          onChange={setDefaultSwitch}
        />
        <Switch
          label="Checked"
          checked={checkedSwitch}
          onChange={setCheckedSwitch}
        />
        <Switch label="Disabled" checked={false} disabled />
      </div>

      <div className="flex gap-4 mt-4">
        <Switch
          label="Gray Default"
          checked={grayDefaultSwitch}
          onChange={setGrayDefaultSwitch}
          color="gray"
        />
        <Switch
          label="Gray Checked"
          checked={grayCheckedSwitch}
          onChange={setGrayCheckedSwitch}
          color="gray"
        />
        <Switch label="Gray Disabled" checked={false} disabled color="gray" />
      </div>
    </ComponentCard>
  );
}
