export const grammar = `
<grammar root="top_level">
	<rule id="top_level">
		<item repeat="0-1">
			<one-of>
				<item>please </item>
				<item>can you </item>
				<item>can you please </item>
				<item>would you </item>
			</one-of>
		</item>
		<ruleref uri="#select"/>
		<tag>out.action=rules.select.action; out.object=rules.select.object;</tag>
	</rule>
	
	<rule id="select">
		<one-of>
			<item>
				<ruleref uri="#actionA"/>
				<tag>out.action=rules.actionA</tag>
				the
				<ruleref uri="#objectA"/>
				<tag>out.object=rules.objectA</tag>
			</item>
			<item>
				<ruleref uri="#actionB"/>
				<tag>out.action=rules.actionB</tag>
				the
				<ruleref uri="#objectB"/>
				<tag>out.object=rules.objectB</tag>
			</item>
		</one-of>
	</rule>
	
	<rule id="object">
	</rule>
	
	<rule id="actionA">
		<one-of>
			<item> turn on <tag>out="on";</tag></item>
			<item> switch on <tag>out="on";</tag></item>
			<item> flick on <tag>out="on";</tag></item>
			<item> turn off <tag>out="off";</tag></item>
			<item> switch off <tag>out="off";</tag></item>
			<item> turn out <tag>out="off";</tag></item>
		</one-of>
	</rule>
	
	<rule id="actionB">
		<one-of>
			<item> open <tag>out="open";</tag></item>
			<item> open up <tag>out="open";</tag></item>
			<item> close <tag>out="close";</tag></item>
			<item> close down <tag>out="close";</tag></item>
		</one-of>
	</rule>
	
	<rule id="objectA"> 
		<one-of> 
			<item> light <tag>out="light";</tag></item> 
			<item> lights <tag>out="light";</tag></item> 
			<item> heat <tag>out="heat";</tag></item> 
			<item> heating <tag>out="heat";</tag></item> 
			<item> A C <tag> out = 'ac'; </tag></item> 
			<item> air conditioning <tag>out="ac";</tag></item> 
	</one-of> 
	</rule>
	
	<rule id="objectB"> 
		<one-of> 
			<item> window <tag>out="window";</tag></item>
			<item> door <tag>out="door";</tag></item> 
	</one-of> 
	</rule>
	
</grammar>
`

